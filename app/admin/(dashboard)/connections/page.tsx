import { EventSwitcher } from "@/components/shared/EventSwitcher"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { resolveAdminEvent } from "@/lib/queries/events"
import { createClient } from "@/lib/supabase/server"

const STATUS_VARIANT: Record<string, "secondary" | "outline" | "destructive"> = {
  verified: "secondary",
  pending: "outline",
  rejected: "destructive",
  expired: "destructive",
}

export default async function AdminConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  const { event: eventSlugParam } = await searchParams
  const { events, current } = await resolveAdminEvent(eventSlugParam)
  if (!current) return <p className="text-muted-foreground">No events yet.</p>

  const supabase = await createClient()
  const { data: connections } = await supabase
    .from("connections")
    .select("*")
    .eq("event_id", current.id)
    .order("scanned_at", { ascending: false })

  const participantIds = Array.from(
    new Set((connections ?? []).flatMap((c) => [c.requester_id, c.recipient_id]))
  )
  const { data: participants } = participantIds.length
    ? await supabase.from("event_participants").select("id, full_name").in("id", participantIds)
    : { data: [] }
  const nameById = new Map((participants ?? []).map((p) => [p.id, p.full_name]))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Connections ({connections?.length ?? 0})</h1>
        <EventSwitcher events={events} currentSlug={current.slug} />
      </div>

      <div className="admin-surface overflow-x-auto p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requester</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scanned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connections?.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{nameById.get(c.requester_id) ?? "—"}</TableCell>
                <TableCell>{nameById.get(c.recipient_id) ?? "—"}</TableCell>
                <TableCell className="uppercase text-xs text-muted-foreground">{c.initiated_via}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[c.status] ?? "outline"}>{c.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(c.scanned_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
