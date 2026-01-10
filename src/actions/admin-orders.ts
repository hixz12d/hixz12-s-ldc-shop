'use server'

import { db } from "@/lib/db"
import { cards, orders, refundRequests, loginUsers } from "@/lib/db/schema"
import { and, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { checkAdmin } from "@/actions/admin"

export async function markOrderPaid(orderId: string) {
  await checkAdmin()
  if (!orderId) throw new Error("Missing order id")

  await db.update(orders).set({
    status: 'paid',
    paidAt: new Date(),
  }).where(eq(orders.orderId, orderId))

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath(`/order/${orderId}`)
}

export async function markOrderDelivered(orderId: string) {
  await checkAdmin()
  if (!orderId) throw new Error("Missing order id")

  const order = await db.query.orders.findFirst({ where: eq(orders.orderId, orderId) })
  if (!order) throw new Error("Order not found")
  if (!order.cardKey) throw new Error("Missing card key; cannot mark delivered")

  await db.update(orders).set({
    status: 'delivered',
    deliveredAt: new Date(),
  }).where(eq(orders.orderId, orderId))

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath(`/order/${orderId}`)
}

export async function cancelOrder(orderId: string) {
  await checkAdmin()
  if (!orderId) throw new Error("Missing order id")

  await db.transaction(async (tx) => {
    // 1. Refund points if used
    const order = await tx.query.orders.findFirst({
      where: eq(orders.orderId, orderId),
      columns: { userId: true, pointsUsed: true }
    })

    if (order?.userId && order.pointsUsed && order.pointsUsed > 0) {
      await tx.update(loginUsers)
        .set({ points: sql`${loginUsers.points} + ${order.pointsUsed}` })
        .where(eq(loginUsers.userId, order.userId))
    }

    await tx.update(orders).set({ status: 'cancelled' }).where(eq(orders.orderId, orderId))
    try {
      await tx.execute(sql`
        ALTER TABLE cards ADD COLUMN IF NOT EXISTS reserved_order_id TEXT;
        ALTER TABLE cards ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMP;
      `)
    } catch {
      // best effort
    }
    await tx.update(cards).set({ reservedOrderId: null, reservedAt: null })
      .where(sql`${cards.reservedOrderId} = ${orderId} AND ${cards.isUsed} = false`)
  })

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath(`/order/${orderId}`)
}

export async function updateOrderEmail(orderId: string, email: string | null) {
  await checkAdmin()
  if (!orderId) throw new Error("Missing order id")
  const next = (email || '').trim()
  await db.update(orders).set({ email: next || null }).where(eq(orders.orderId, orderId))
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
}

async function deleteOneOrder(tx: any, orderId: string) {
  const order = await tx.query.orders.findFirst({ where: eq(orders.orderId, orderId) })
  if (!order) return

  // Refund points if used
  if (order.userId && order.pointsUsed && order.pointsUsed > 0) {
    await tx.update(loginUsers)
      .set({ points: sql`${loginUsers.points} + ${order.pointsUsed}` })
      .where(eq(loginUsers.userId, order.userId))
  }

  // Release reserved card if any
  try {
    await tx.execute(sql`
      ALTER TABLE cards ADD COLUMN IF NOT EXISTS reserved_order_id TEXT;
      ALTER TABLE cards ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMP;
    `)
  } catch {
    // best effort
  }

  await tx.update(cards).set({ reservedOrderId: null, reservedAt: null })
    .where(sql`${cards.reservedOrderId} = ${orderId} AND ${cards.isUsed} = false`)

  // Delete related refund requests (best effort)
  try {
    await tx.delete(refundRequests).where(eq(refundRequests.orderId, orderId))
  } catch {
    // table may not exist yet
  }

  await tx.delete(orders).where(eq(orders.orderId, orderId))
}

export async function deleteOrder(orderId: string) {
  await checkAdmin()
  if (!orderId) throw new Error("Missing order id")

  await db.transaction(async (tx) => {
    await deleteOneOrder(tx, orderId)
  })

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
}

export async function deleteOrders(orderIds: string[]) {
  await checkAdmin()
  const ids = (orderIds || []).map((s) => String(s).trim()).filter(Boolean)
  if (!ids.length) return

  await db.transaction(async (tx) => {
    for (const id of ids) {
      await deleteOneOrder(tx, id)
    }
  })

  revalidatePath('/admin/orders')
}

export async function verifyOrderRefundStatus(orderId: string) {
  await checkAdmin()
  if (!orderId) throw new Error("Missing order id")

  const merchantId = process.env.MERCHANT_ID
  const merchantKey = process.env.MERCHANT_KEY
  if (!merchantId || !merchantKey) throw new Error("Missing merchant config")

  // Use the API URL from pay url or default
  const payUrl = process.env.PAY_URL || 'https://credit.linux.do/epay/pay/submit.php'

  let apiUrl = 'https://credit.linux.do/epay/api.php' // Default fallback
  try {
    const urlObj = new URL(payUrl)
    // If payUrl is .../pay/submit.php, api is usually .../api.php
    // construct api url
    apiUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.replace('/pay/submit.php', '/api.php').replace('/submit.php', '/api.php')}`
    if (!apiUrl.endsWith('api.php')) {
      apiUrl = `${urlObj.protocol}//${urlObj.host}/epay/api.php`
    }
  } catch (e) {
    // ignore invalid pay url
  }

  const query = new URLSearchParams({
    act: 'order',
    pid: merchantId,
    key: merchantKey,
    out_trade_no: orderId
  })

  try {
    const res = await fetch(`${apiUrl}?${query.toString()}`)
    const data = await res.json()

    if (data.code === 1) {
      // status 0 = Refunded (according to user)
      if (data.status === 0) {
        await db.update(orders).set({ status: 'refunded' }).where(eq(orders.orderId, orderId))
        revalidatePath('/admin/orders')
        return { success: true, status: data.status, msg: 'Refunded (Verified)' }
      } else if (data.status === 1) {
        return { success: true, status: data.status, msg: 'Paid (Not Refunded)' }
      } else {
        return { success: true, status: data.status, msg: `Status: ${data.status}` }
      }
    } else {
      return { success: false, error: data.msg || 'Query failed' }
    }

  } catch (e: any) {
    console.error('Verify refund error', e)
    return { success: false, error: e.message }
  }
}
