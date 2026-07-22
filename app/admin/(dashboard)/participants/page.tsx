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

  // Posted challenges (the `challenges` table, not just the single
  // biggest_challenge free-text field) and verified connections — added
  // to this admin-only export so organizers can see, per participant,
  // what they've posted and who they can reach out to. Deliberately not
  // exposed on the public landing-page board (features/board/LiveBoard.tsx),
  // which never renders contact info.
  const { data: challengesData } = participantIds.length
    ? await supabase.from("challenges").select("title, status, author_id").eq("event_id", current.id)
    : { data: [] }
  const challengesByAuthorId = new Map<string, { title: string; status: string }[]>()
  for (const c of challengesData ?? []) {
    const list = challengesByAuthorId.get(c.author_id) ?? []
    list.push({ title: c.title, status: c.status })
    challengesByAuthorId.set(c.author_id, list)
  }

  const { data: connectionsData } = participantIds.length
    ? await supabase
        .from("connections")
        .select("requester_id, recipient_id")
        .eq("event_id", current.id)
        .eq("status", "accepted")
    : { data: [] }
  const nameById = new Map((participants ?? []).map((p) => [p.id, p.full_name]))
  const connectionsByParticipantId = new Map<string, string[]>()
  for (const c of connectionsData ?? []) {
    if (!connectionsByParticipantId.has(c.requester_id)) connectionsByParticipantId.set(c.requester_id, [])
    if (!connectionsByParticipantId.has(c.recipient_id)) connectionsByParticipantId.set(c.recipient_id, [])
    connectionsByParticipantId.get(c.requester_id)!.push(nameById.get(c.recipient_id) ?? "Someone")
    connectionsByParticipantId.get(c.recipient_id)!.push(nameById.get(c.requester_id) ?? "Someone")
  }

  // Potential connections — the AI-reranked matches already computed by
  // computeMatchesForParticipant (features/matchmaking/actions.ts), not
  // yet acted on by either person. Ordered by score descending overall,
  // which preserves descending order within each participant's own
  // subset too, so capping at 5 per participant needs no extra sort.
  const { data: matchesData } = participantIds.length
    ? await supabase
        .from("matches")
        .select("participant_id, matched_participant_id, score")
        .eq("event_id", current.id)
        .order("score", { ascending: false })
    : { data: [] }
  const potentialByParticipantId = new Map<string, { name: string; score: number }[]>()
  for (const m of matchesData ?? []) {
    const list = potentialByParticipantId.get(m.participant_id) ?? []
    if (list.length < 5) {
      list.push({ name: nameById.get(m.matched_participant_id) ?? "Someone", score: Number(m.score) })
      potentialByParticipantId.set(m.participant_id, list)
    }
  }

  const exportRows = (participants ?? []).map((p) => {
    const contact = contactsByParticipantId.get(p.id)
    const posted = challengesByAuthorId.get(p.id) ?? []
    const connectedTo = connectionsByParticipantId.get(p.id) ?? []
    const potential = potentialByParticipantId.get(p.id) ?? []
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
      "Posted challenges": posted.map((c) => `${c.title} (${c.status})`).join("; "),
      "Future self aspiration": p.future_self_aspiration ?? "",
      Connections: connectedTo.join("; "),
      "Potential connections": potential.map((m) => `${m.name} (${Math.round(m.score)})`).join("; "),
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
              <TableHead>Posted Challenges</TableHead>
              <TableHead>Future Self</TableHead>
              <TableHead>Connections</TableHead>
              <TableHead>Potential Connections</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants?.map((p) => {
              const contact = contactsByParticipantId.get(p.id)
              const posted = challengesByAuthorId.get(p.id) ?? []
              const connectedTo = connectionsByParticipantId.get(p.id) ?? []
              const potential = potentialByParticipantId.get(p.id) ?? []
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
                  <TableCell className="max-w-48 truncate">
                    {posted.map((c) => `${c.title} (${c.status})`).join("; ") || "—"}
                  </TableCell>
                  <TableCell>{p.future_self_aspiration ?? "—"}</TableCell>
                  <TableCell className="max-w-40 truncate">{connectedTo.join(", ") || "—"}</TableCell>
                  <TableCell className="max-w-48 truncate">
                    {potential.map((m) => `${m.name} (${Math.round(m.score)})`).join(", ") || "—"}
                  </TableCell>
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
