import { EventSwitcher } from "@/components/shared/EventSwitcher"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { setParticipantVisibility } from "@/features/moderation/actions"
import { resolveAdminEvent } from "@/lib/queries/events"
import { createClient } from "@/lib/supabase/server"

export default async function AdminParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  const { event: eventSlugParam } = await searchParams
  const { events, current } = await resolveAdminEvent(eventSlugParam)
  if (!current) return <p className="text-muted-foreground">No events yet.</p>

  const path = `/admin/participants?event=${current.slug}`
  const supabase = await createClient()
  const { data: participants } = await supabase
    .from("event_participants")
    .select("*")
    .eq("event_id", current.id)
    .order("joined_at", { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Participants ({participants?.length ?? 0})</h1>
        <EventSwitcher events={events} currentSlug={current.slug} />
      </div>

      <div className="admin-surface overflow-x-auto p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.full_name}</TableCell>
                <TableCell>{p.company ?? "—"}</TableCell>
                <TableCell>{p.industry.replace(/_/g, " ")}</TableCell>
                <TableCell>{p.business_stage.replace(/_/g, " ")}</TableCell>
                <TableCell>{p.contribution_score}</TableCell>
                <TableCell>
                  <Badge variant={p.is_visible ? "secondary" : "destructive"}>
                    {p.is_visible ? "Visible" : "Hidden"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <form action={setParticipantVisibility.bind(null, path, p.id, !p.is_visible)}>
                    <Button size="sm" variant="outline" type="submit">
                      {p.is_visible ? "Hide" : "Unhide"}
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
