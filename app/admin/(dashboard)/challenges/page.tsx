import { EventSwitcher } from "@/components/shared/EventSwitcher"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { setChallengeFlagged } from "@/features/moderation/actions"
import { resolveAdminEvent } from "@/lib/queries/events"
import { createClient } from "@/lib/supabase/server"

export default async function AdminChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  const { event: eventSlugParam } = await searchParams
  const { events, current } = await resolveAdminEvent(eventSlugParam)
  if (!current) return <p className="text-muted-foreground">No events yet.</p>

  const path = `/admin/challenges?event=${current.slug}`
  const supabase = await createClient()
  const { data: challenges } = await supabase
    .from("challenges")
    .select("*")
    .eq("event_id", current.id)
    .order("created_at", { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Challenges ({challenges?.length ?? 0})</h1>
        <EventSwitcher events={events} currentSlug={current.slug} />
      </div>

      <div className="admin-surface overflow-x-auto p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Flagged</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {challenges?.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="max-w-xs truncate font-medium">{c.title}</TableCell>
                <TableCell>
                  <Badge variant={c.status === "solved" ? "secondary" : "outline"}>{c.status}</Badge>
                </TableCell>
                <TableCell>
                  {c.is_flagged ? <Badge variant="destructive">Flagged</Badge> : "—"}
                </TableCell>
                <TableCell>
                  <form action={setChallengeFlagged.bind(null, path, c.id, !c.is_flagged)}>
                    <Button size="sm" variant="outline" type="submit">
                      {c.is_flagged ? "Unflag" : "Flag"}
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
