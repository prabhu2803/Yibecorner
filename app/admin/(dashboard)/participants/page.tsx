import { EventSwitcher } from "@/components/shared/EventSwitcher"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExportCsvButton } from "@/features/admin/ExportCsvButton"
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

  // Mobile/WhatsApp numbers live in their own table (participant_contacts,
  // not event_participants) since event_participants has a public select
  // policy for discovery/matching — contact numbers must not be readable
  // that way. This query only succeeds for an admin session; see that
  // table's RLS policies in 0016_add_participant_contacts.sql.
  const participantIds = (participants ?? []).map((p) => p.id)
  const { data: contacts } = participantIds.length
    ? await supabase.from("participant_contacts").select("*").in("participant_id", participantIds)
    : { data: [] }
  const contactsByParticipantId = new Map((contacts ?? []).map((c) => [c.participant_id, c]))

  const exportRows = (participants ?? []).map((p) => {
    const contact = contactsByParticipantId.get(p.id)
    return {
      "Full name": p.full_name,
      Company: p.company ?? "",
      Designation: p.designation ?? "",
      City: p.city ?? "",
      Industry: p.industry === "other" ? (p.industry_other ?? "other") : p.industry,
      "Business stage": p.business_stage,
      "Mobile number": contact?.mobile_number ?? "",
      "WhatsApp number": contact?.whatsapp_number ?? "",
      "Looking for": (p.looking_for ?? []).join("; "),
      "Can help with": (p.can_help_with ?? []).join("; "),
      "Biggest challenge": p.biggest_challenge ?? "",
      "Challenge category": p.challenge_category ?? "",
      "Future self aspiration": p.future_self_aspiration ?? "",
      "Contribution score": p.contribution_score,
      Visible: p.is_visible ? "Yes" : "No",
      "Joined at": p.joined_at,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Participants ({participants?.length ?? 0})</h1>
        <div className="flex items-center gap-3">
          <ExportCsvButton rows={exportRows} filename={`${current.slug}-participants.csv`} />
          <EventSwitcher events={events} currentSlug={current.slug} />
        </div>
      </div>

      <div className="admin-surface overflow-x-auto p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Looking For</TableHead>
              <TableHead>Can Help With</TableHead>
              <TableHead>Challenge</TableHead>
              <TableHead>Future Self</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants?.map((p) => {
              const contact = contactsByParticipantId.get(p.id)
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell>{p.company ?? "—"}</TableCell>
                  <TableCell>{p.designation ?? "—"}</TableCell>
                  <TableCell>{p.city ?? "—"}</TableCell>
                  <TableCell>
                    {p.industry === "other" ? (p.industry_other ?? "other") : p.industry.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>{p.business_stage.replace(/_/g, " ")}</TableCell>
                  <TableCell className="whitespace-nowrap">{contact?.mobile_number ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{contact?.whatsapp_number ?? "—"}</TableCell>
                  <TableCell className="max-w-40 truncate">{(p.looking_for ?? []).join(", ") || "—"}</TableCell>
                  <TableCell className="max-w-40 truncate">{(p.can_help_with ?? []).join(", ") || "—"}</TableCell>
                  <TableCell className="max-w-48 truncate">{p.biggest_challenge ?? "—"}</TableCell>
                  <TableCell>{p.future_self_aspiration ?? "—"}</TableCell>
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
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
