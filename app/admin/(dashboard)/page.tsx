import {
  Users,
  UserCheck,
  Handshake,
  MessageSquareText,
  CheckCircle2,
  Lightbulb,
  Users2,
} from "lucide-react"

import { EventSwitcher } from "@/components/shared/EventSwitcher"
import { EngagementTimeline } from "@/features/analytics/EngagementTimeline"
import { resolveAdminEvent } from "@/lib/queries/events"
import { createClient } from "@/lib/supabase/server"

const STAT_CARDS = [
  { key: "entrepreneurs_joined", label: "Total Participants", icon: Users },
  { key: "profiles_completed", label: "Profiles Completed", icon: UserCheck },
  { key: "verified_connections", label: "Verified Connections", icon: Handshake },
  { key: "challenges_posted", label: "Challenges", icon: MessageSquareText },
  { key: "problems_solved", label: "Problems Solved", icon: CheckCircle2 },
  { key: "best_practices_shared", label: "Best Practices", icon: Lightbulb },
  { key: "discussions_active", label: "Discussions", icon: Users2 },
] as const

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  const { event: eventSlugParam } = await searchParams
  const { events, current } = await resolveAdminEvent(eventSlugParam)

  if (!current) {
    return <p className="text-muted-foreground">No events yet. Create one to get started.</p>
  }

  const supabase = await createClient()
  const [{ data: stats }, { count: profilesCompleted }, { data: analytics }] = await Promise.all([
    supabase.from("event_stats").select("*").eq("event_id", current.id).maybeSingle(),
    supabase
      .from("event_participants")
      .select("id", { count: "exact", head: true })
      .eq("event_id", current.id)
      .not("onboarding_completed_at", "is", null),
    supabase
      .from("analytics_events")
      .select("created_at")
      .eq("event_id", current.id)
      .order("created_at", { ascending: true }),
  ])

  const values: Record<string, number> = {
    entrepreneurs_joined: stats?.entrepreneurs_joined ?? 0,
    profiles_completed: profilesCompleted ?? 0,
    verified_connections: stats?.verified_connections ?? 0,
    challenges_posted: stats?.challenges_posted ?? 0,
    problems_solved: stats?.problems_solved ?? 0,
    best_practices_shared: stats?.best_practices_shared ?? 0,
    discussions_active: stats?.discussions_active ?? 0,
  }

  const dayBuckets = new Map<string, number>()
  for (const row of analytics ?? []) {
    const day = new Date(row.created_at).toISOString().slice(0, 10)
    dayBuckets.set(day, (dayBuckets.get(day) ?? 0) + 1)
  }
  const timeline = Array.from(dayBuckets.entries()).map(([day, count]) => ({ day, count }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{current.name}</h1>
        <EventSwitcher events={events} currentSlug={current.slug} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="admin-surface flex flex-col gap-2 p-4">
            <Icon className="size-5 text-accent" />
            <span className="text-2xl font-bold tabular-nums">{values[key]}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <div className="admin-surface p-4">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Engagement Timeline</h2>
        <EngagementTimeline data={timeline} />
      </div>
    </div>
  )
}
