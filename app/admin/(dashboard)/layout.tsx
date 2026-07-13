import Link from "next/link"
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

import { SignOutButton } from "@/features/admin-auth/SignOutButton"

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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="admin-surface m-3 flex w-56 shrink-0 flex-col gap-1 p-3">
        <div className="px-2 py-3">
          <p className="text-gradient-vibe text-lg font-bold">Vibe Corner</p>
          <p className="text-xs text-muted-foreground">Admin</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <SignOutButton />
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
