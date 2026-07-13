import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { setEventStatus } from "@/features/events-admin/actions"
import { createClient } from "@/lib/supabase/server"

const STATUSES = ["draft", "live", "ended"] as const

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle()
  if (!event) notFound()

  const { data: settings } = await supabase
    .from("event_settings")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-sm text-muted-foreground">/{event.slug}</p>
        </div>
        <Badge variant={event.status === "live" ? "secondary" : "outline"}>{event.status}</Badge>
      </div>

      <div className="admin-surface flex flex-col gap-3 p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">Status</h2>
        <div className="flex gap-2">
          {STATUSES.map((status) => (
            <form key={status} action={setEventStatus.bind(null, event.id, status)}>
              <Button size="sm" variant={event.status === status ? "default" : "outline"} type="submit">
                {status}
              </Button>
            </form>
          ))}
        </div>
      </div>

      <div className="admin-surface flex flex-col gap-2 p-4 text-sm text-muted-foreground">
        <h2 className="text-sm font-semibold text-foreground">Current Settings</h2>
        <p>Show QR: {settings?.show_qr ? "Yes" : "No"}</p>
        <p>Show Participant Names: {settings?.show_participant_names ? "Yes" : "No"}</p>
        <p>Emergency Static Mode: {settings?.emergency_static_mode ? "Yes" : "No"}</p>
        <p className="pt-2">Manage these live from the Screen Control page.</p>
      </div>
    </div>
  )
}
