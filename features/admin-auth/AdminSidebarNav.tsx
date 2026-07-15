"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  MonitorPlay,
  Users,
  MessageSquareText,
  Lightbulb,
  Users2,
  Handshake,
  BarChart3,
  CalendarDays,
} from "lucide-react"

import { cn } from "@/lib/utils"

// Defined here (not passed in as a prop) because lucide icon components
// aren't plain serializable objects — passing them from the (server)
// AdminLayout down to this client component throws "Only plain objects
// can be passed to Client Components from Server Components." Matches
// MobileNav's own self-contained items array for the same reason.
const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/screen-control", label: "Screen Control", icon: MonitorPlay },
  { href: "/admin/participants", label: "Participants", icon: Users },
  { href: "/admin/challenges", label: "Challenges", icon: MessageSquareText },
  { href: "/admin/best-practices", label: "Best Practices", icon: Lightbulb },
  { href: "/admin/discussions", label: "Discussions", icon: Users2 },
  { href: "/admin/connections", label: "Connections", icon: Handshake },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
]

export function AdminSidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-1 flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition",
              active
                ? "cc-neon-primary bg-[var(--cc-primary)]/12 text-[var(--cc-primary)]"
                : "text-[var(--cc-on-surface-variant)] hover:bg-white/5 hover:text-[var(--cc-on-surface)]"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
