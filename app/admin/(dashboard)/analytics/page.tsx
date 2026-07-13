import { EventSwitcher } from "@/components/shared/EventSwitcher"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EngagementTimeline } from "@/features/analytics/EngagementTimeline"
import { resolveAdminEvent } from "@/lib/queries/events"
import { createClient } from "@/lib/supabase/server"

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  const { event: eventSlugParam } = await searchParams
  const { events, current } = await resolveAdminEvent(eventSlugParam)
  if (!current) return <p className="text-muted-foreground">No events yet.</p>

  const supabase = await createClient()
  const { data: analytics } = await supabase
    .from("analytics_events")
    .select("event_name, created_at")
    .eq("event_id", current.id)
    .order("created_at", { ascending: true })

  const dayBuckets = new Map<string, number>()
  const nameCounts = new Map<string, number>()
  for (const row of analytics ?? []) {
    const day = new Date(row.created_at).toISOString().slice(0, 10)
    dayBuckets.set(day, (dayBuckets.get(day) ?? 0) + 1)
    nameCounts.set(row.event_name, (nameCounts.get(row.event_name) ?? 0) + 1)
  }
  const timeline = Array.from(dayBuckets.entries()).map(([day, count]) => ({ day, count }))
  const breakdown = Array.from(nameCounts.entries()).sort((a, b) => b[1] - a[1])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <EventSwitcher events={events} currentSlug={current.slug} />
      </div>

      <div className="admin-surface p-4">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Engagement Over Time</h2>
        <EngagementTimeline data={timeline} />
      </div>

      <div className="admin-surface overflow-x-auto p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakdown.map(([name, count]) => (
              <TableRow key={name}>
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell>{count}</TableCell>
              </TableRow>
            ))}
            {breakdown.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">
                  No analytics events recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
