'use client'

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

interface ShopLogoProps {
    name: string
    url: string
    logo?: string | null
}

function getFaviconUrl(url: string) {
    try {
        const origin = new URL(url).origin
        return `${origin}/favicon.ico`
    } catch {
        return ""
    }
}

export function ShopLogo({ name, url, logo }: ShopLogoProps) {
    const [error, setError] = useState(false)
    const fallbackLetter = name?.trim()?.slice(0, 1) || "L"
    const favicon = useMemo(() => getFaviconUrl(url), [url])
    const src = (logo || "").trim() || favicon

    return (
        <div
            className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/40 text-sm font-semibold text-muted-foreground",
                src && !error ? "bg-transparent" : ""
            )}
        >
            {src && !error ? (
                <img
                    src={src}
                    alt={name}
                    className="h-12 w-12 rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setError(true)}
                />
            ) : (
                fallbackLetter
            )}
        </div>
    )
}
