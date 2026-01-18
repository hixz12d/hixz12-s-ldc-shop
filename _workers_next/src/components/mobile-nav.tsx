'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useI18n } from "@/lib/i18n/context"
import { Compass, Home, Package, Settings, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileNavProps {
    isLoggedIn: boolean
    isAdmin: boolean
}

export function MobileNav({ isLoggedIn, isAdmin }: MobileNavProps) {
    const { t } = useI18n()
    const pathname = usePathname()

    const isZh = t('common.myOrders').includes('订单')
    
    const navItems = [
        {
            href: "/",
            label: isZh ? "首页" : "Home",
            icon: Home,
            active: pathname === "/"
        },
        ...(isLoggedIn ? [{
            href: "/orders",
            label: isZh ? "订单" : "Orders",
            icon: Package,
            active: pathname === "/orders" || pathname.startsWith("/order/")
        }] : []),
        ...(isAdmin ? [{
            href: "/admin/settings",
            label: t('common.admin'),
            icon: Settings,
            active: pathname.startsWith("/admin")
        }] : []),
        {
            href: "/nav",
            label: t('common.navigator'),
            icon: Compass,
            active: pathname === "/nav" || pathname === "/navi"
        },
        ...(isLoggedIn ? [{
            href: "/profile",
            label: isZh ? "个人中心" : "Profile",
            icon: User,
            active: pathname === "/profile"
        }] : [])
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border/50 safe-area-pb">
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                            item.active 
                                ? "text-foreground" 
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <item.icon className={cn(
                            "h-5 w-5",
                            item.active && "text-primary"
                        )} />
                        <span className={cn(
                            "text-xs font-medium",
                            item.active && "text-primary"
                        )}>{item.label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    )
}
