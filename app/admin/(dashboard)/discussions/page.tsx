import { EventSwitcher } from "@/components/shared/EventSwitcher"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { convertDiscussionToCircle } from "@/features/moderation/actions"
import { resolveAdminEvent } from "@/lib/queries/events"
import { createClient } from "@/lib/supabase/server"

export default async function AdminDiscussionsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  const { event: eventSlugParam } = await searchParams
  const { events, current } = await resolveAdminEvent(eventSlugParam)
  if (!current) return <p className="text-muted-foreground">No events yet.</p>

  const path = `/admin/discussions?event=${current.slug}`
  const supabase = await createClient()
  const { data: discussions } = await supabase
    .from("discussions")
    .select("*")
    .eq("event_id", current.id)
    .order("participant_count", { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Discussions ({discussions?.length ?? 0})</h1>
        <EventSwitcher events={events} currentSlug={current.slug} />
      </div>

      <div className="flex flex-col gap-3">
        {discussions?.map((d) => (
          <div key={d.id} className="admin-surface flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">{d.topic}</p>
              <p className="text-xs text-muted-foreground">{d.participant_count} members</p>
            </div>
            {d.status === "converted" ? (
              <Badge className="bg-accent/20 text-accent">Circle at {d.circle_location}</Badge>
            ) : (
              <form
                action={convertDiscussionToCircle.bind(null, path, d.id)}
                className="flex gap-2"
              >
                <Input name="circleLocation" placeholder="e.g. Table 4, near the entrance" className="w-56" />
                <Button size="sm" type="submit">
                  Convert to Circle
                </Button>
              </form>
            )}
          </div>
        ))}
        {!discussions?.length && <p className="text-sm text-muted-foreground">No discussions yet.</p>}
      </div>
    </div>
  )
}
