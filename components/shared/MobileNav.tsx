"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"

export function MobileNav({ eventSlug }: { eventSlug: string }) {
  const pathname = usePathname()
  const base = `/join/${eventSlug}`

  const items = [
    { href: `${base}/home`, label: "Home", icon: "home" },
    { href: `${base}/matches`, label: "Matches", icon: "auto_awesome" },
    { href: `${base}/yibe`, label: "YIBE", icon: "groups" },
    { href: `${base}/connections`, label: "Connections", icon: "handshake" },
    { href: `${base}/profile`, label: "Profile", icon: "person" },
  ]

  return (
    <nav className="cc-glass-panel fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between rounded-2xl px-2 py-2">
      {items.map(({ href, label, icon }) => {
        const active = pathname?.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium transition",
              active ? "text-[var(--cc-primary)]" : "text-[var(--cc-on-surface-variant)]"
            )}
          >
            <MaterialIcon name={icon} className={cn("text-[20px]", active && "cc-neon-primary rounded-full")} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
