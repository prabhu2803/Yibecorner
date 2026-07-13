"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Sparkles, Users, QrCode, UserRound } from "lucide-react"

import { cn } from "@/lib/utils"

export function MobileNav({ eventSlug }: { eventSlug: string }) {
  const pathname = usePathname()
  const base = `/join/${eventSlug}`

  const items = [
    { href: `${base}/home`, label: "Home", icon: Home },
    { href: `${base}/matches`, label: "Matches", icon: Sparkles },
    { href: `${base}/yibe`, label: "YIBE", icon: Users },
    { href: `${base}/connections`, label: "Connect", icon: QrCode },
    { href: `${base}/profile`, label: "Profile", icon: UserRound },
  ]

  return (
    <nav className="glass-card fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between px-2 py-2">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname?.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium transition",
              active ? "text-accent" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("size-5", active && "glow-amber rounded-full")} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
