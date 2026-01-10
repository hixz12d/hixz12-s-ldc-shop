'use client'

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Eye, EyeOff, ArrowUp, ArrowDown, TrendingUp, ShoppingCart, CreditCard, Package, Users } from "lucide-react"
import { deleteProduct, toggleProductStatus, reorderProduct, saveShopName, saveLowStockThreshold, saveCheckinReward, saveCheckinEnabled } from "@/actions/admin"
import { toast } from "sonner"

interface Product {
    id: string
    name: string
    price: string
    compareAtPrice: string | null
    category: string | null
    stockCount: number
    isActive: boolean
    isHot: boolean
    sortOrder: number
}

interface Stats {
    today: { count: number; revenue: number }
    week: { count: number; revenue: number }
    month: { count: number; revenue: number }
    total: { count: number; revenue: number }
}

interface AdminProductsContentProps {
    products: Product[]
    stats: Stats
    shopName: string | null
    visitorCount: number
    lowStockThreshold: number
    checkinReward: number
    checkinEnabled: boolean
}

export function AdminProductsContent({ products, stats, shopName, visitorCount, lowStockThreshold, checkinReward, checkinEnabled }: AdminProductsContentProps) {
    const { t } = useI18n()

    // State
    const [shopNameValue, setShopNameValue] = useState(shopName || '')
    const [savingShopName, setSavingShopName] = useState(false)
    const [thresholdValue, setThresholdValue] = useState(String(lowStockThreshold || 5))
    const [savingThreshold, setSavingThreshold] = useState(false)
    // Use distinct name to avoid ANY collision
    const [rewardValue, setRewardValue] = useState(String(checkinReward || 10))
    const [savingReward, setSavingReward] = useState(false)
    const [enabledCheckin, setEnabledCheckin] = useState(checkinEnabled)
    const [savingEnabled, setSavingEnabled] = useState(false)

    // Derived state directly to avoid Hook complexity/errors
    const threshold = Number.parseInt(thresholdValue, 10) || 5
    const lowStockCount = (products || []).filter(p => p.stockCount <= threshold).length

    const handleDelete = async (id: string) => {
        if (!confirm(t('admin.products.confirmDelete'))) return
        try {
            await deleteProduct(id)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    const handleToggle = async (id: string, currentStatus: boolean) => {
        try {
            await toggleProductStatus(id, !currentStatus)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    const handleReorder = async (id: string, direction: 'up' | 'down') => {
        const idx = products.findIndex(p => p.id === id)
        if (idx === -1) return

        // Swap with neighbor
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1
        if (targetIdx < 0 || targetIdx >= products.length) return

        const current = products[idx]
        const target = products[targetIdx]

        try {
            // Use index as sortOrder to ensure unique values
            await reorderProduct(current.id, targetIdx)
            await reorderProduct(target.id, idx)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    const handleSaveShopName = async () => {
        const trimmed = shopNameValue.trim()
        if (!trimmed) {
            toast.error(t('admin.settings.shopNameEmpty'))
            return
        }
        setSavingShopName(true)
        try {
            await saveShopName(trimmed)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSavingShopName(false)
        }
    }

    const handleSaveThreshold = async () => {
        setSavingThreshold(true)
        try {
            await saveLowStockThreshold(thresholdValue)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSavingThreshold(false)
        }
    }

    const handleSaveReward = async () => {
        setSavingReward(true)
        try {
            await saveCheckinReward(rewardValue)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSavingReward(false)
        }
    }

    const handleToggleCheckin = async (checked: boolean) => {
        setSavingEnabled(true)
        try {
            await saveCheckinEnabled(checked)
            setEnabledCheckin(checked)
            toast.success(t('common.success'))
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSavingEnabled(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Shop Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.settings.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-2 md:max-w-xl">
                        <Label htmlFor="shop-name">{t('admin.settings.shopName')}</Label>
                        <Input
                            id="shop-name"
                            value={shopNameValue}
                            onChange={(e) => setShopNameValue(e.target.value)}
                            placeholder={t('admin.settings.shopNamePlaceholder')}
                        />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <Button onClick={handleSaveShopName} disabled={savingShopName}>
                            {savingShopName ? t('common.processing') : t('admin.settings.save')}
                        </Button>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                className="w-20"
                                value={thresholdValue}
                                onChange={(e) => setThresholdValue(e.target.value)}
                                placeholder="5"
                                title={t('admin.settings.lowStockThreshold')}
                            />
                            <Button variant="outline" onClick={handleSaveThreshold} disabled={savingThreshold}>
                                {savingThreshold ? t('common.processing') : t('admin.settings.saveThreshold')}
                            </Button>
                        </div>

                        <div className="flex items-center gap-3 border-l pl-3 ml-2">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="checkin-enable" className="cursor-pointer">{t('admin.settings.checkin.title')}</Label>
                                <Button
                                    id="checkin-enable"
                                    variant={enabledCheckin ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleToggleCheckin(!enabledCheckin)}
                                    disabled={savingEnabled}
                                    className={enabledCheckin ? "bg-green-600 hover:bg-green-700" : ""}
                                >
                                    {enabledCheckin ? t('admin.settings.checkin.enabled') : t('admin.settings.checkin.disabled')}
                                </Button>
                            </div>
                            {enabledCheckin && (
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        className="w-20"
                                        value={rewardValue}
                                        onChange={(e) => setRewardValue(e.target.value)}
                                        placeholder="10"
                                        title={t('admin.settings.checkin.rewardTooltip')}
                                    />
                                    <Button variant="outline" onClick={handleSaveReward} disabled={savingReward}>
                                        {savingReward ? t('common.processing') : t('admin.settings.checkin.saveReward')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground">{t('admin.settings.shopNameHint')}</p>
                </CardContent>
            </Card>

            {/* Dashboard Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.stats.today')}</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.today.count}</div>
                        <p className="text-xs text-muted-foreground">{stats.today.revenue.toFixed(0)} {t('common.credits')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.stats.week')}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.week.count}</div>
                        <p className="text-xs text-muted-foreground">{stats.week.revenue.toFixed(0)} {t('common.credits')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.stats.month')}</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.month.count}</div>
                        <p className="text-xs text-muted-foreground">{stats.month.revenue.toFixed(0)} {t('common.credits')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.stats.total')}</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total.count}</div>
                        <p className="text-xs text-muted-foreground">{stats.total.revenue.toFixed(0)} {t('common.credits')}</p>
                    </CardContent>
                </Card>
                <Link href="/admin/users" className="block">
                    <Card className="hover:bg-accent/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('admin.stats.visitors')}</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{visitorCount}</div>
                            <p className="text-xs text-muted-foreground">{t('home.visitorCount', { count: visitorCount })}</p>
                        </CardContent>
                    </Card>
                </Link>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.stats.lowStock')}</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{lowStockCount}</div>
                        <p className="text-xs text-muted-foreground">{t('admin.stats.lowStockHint', { threshold: Number.parseInt(thresholdValue, 10) || 5 })}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Products Table */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{t('admin.products.title')}</h1>
                <Link href="/admin/product/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('admin.products.addNew')}
                    </Button>
                </Link>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">{t('admin.products.order')}</TableHead>
                            <TableHead>{t('admin.products.name')}</TableHead>
                            <TableHead>{t('admin.products.price')}</TableHead>
                            <TableHead>{t('admin.products.category')}</TableHead>
                            <TableHead>{t('admin.products.hot')}</TableHead>
                            <TableHead>{t('admin.products.stock')}</TableHead>
                            <TableHead>{t('admin.products.status')}</TableHead>
                            <TableHead className="text-right">{t('admin.products.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product, idx) => (
                            <TableRow key={product.id} className={!product.isActive ? 'opacity-50' : ''}>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => handleReorder(product.id, 'up')}
                                            disabled={idx === 0}
                                        >
                                            <ArrowUp className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => handleReorder(product.id, 'down')}
                                            disabled={idx === products.length - 1}
                                        >
                                            <ArrowDown className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span>{Number(product.price)}</span>
                                        {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
                                            <span className="text-xs text-muted-foreground line-through">
                                                {Number(product.compareAtPrice)}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="capitalize">{product.category || 'general'}</TableCell>
                                <TableCell>
                                    {product.isHot ? (
                                        <Badge variant="secondary">{t('common.yes')}</Badge>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span>{product.stockCount}</span>
                                        {product.stockCount <= (Number.parseInt(thresholdValue, 10) || 5) && (
                                            <Badge variant="destructive" className="text-[10px]">{t('admin.products.lowStock')}</Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={product.isActive ? 'default' : 'secondary'}>
                                        {product.isActive ? t('admin.products.active') : t('admin.products.inactive')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleToggle(product.id, product.isActive)}
                                        title={product.isActive ? t('admin.products.hide') : t('admin.products.show')}
                                    >
                                        {product.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                    <Link href={`/admin/cards/${product.id}`}>
                                        <Button variant="outline" size="sm">{t('admin.products.manageCards')}</Button>
                                    </Link>
                                    <Link href={`/admin/product/edit/${product.id}`}>
                                        <Button variant="outline" size="sm">{t('common.edit')}</Button>
                                    </Link>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id)}>
                                        {t('common.delete')}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
