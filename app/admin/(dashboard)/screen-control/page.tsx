import { EventSwitcher } from "@/components/shared/EventSwitcher"
import { ScreenControlPanel } from "@/features/screen-control/ScreenControlPanel"
import { resolveAdminEvent } from "@/lib/queries/events"

export default async function ScreenControlPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  const { event: eventSlugParam } = await searchParams
  const { events, current } = await resolveAdminEvent(eventSlugParam)

  if (!current) {
    return <p className="text-muted-foreground">No events yet.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Screen Control</h1>
        <EventSwitcher events={events} currentSlug={current.slug} />
      </div>
      <ScreenControlPanel eventId={current.id} />
    </div>
  )
}
