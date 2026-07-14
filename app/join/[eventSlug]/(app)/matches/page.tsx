import { notFound, redirect } from "next/navigation"

import { AppTopBar } from "@/components/shared/AppTopBar"
import { MatchCard } from "@/features/matchmaking/MatchCard"
import { getEventBySlug } from "@/lib/queries/events"
import { createClient } from "@/lib/supabase/server"

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params
  const result = await getEventBySlug(eventSlug)
  if (!result) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/join/${eventSlug}`)

  const { data: me } = await supabase
    .from("event_participants")
    .select("id, full_name")
    .eq("event_id", result.event.id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!me) redirect(`/join/${eventSlug}/onboard`)

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("participant_id", me.id)
    .order("score", { ascending: false })

  const matchedIds = (matches ?? []).map((m) => m.matched_participant_id)
  const { data: matchedParticipants } = matchedIds.length
    ? await supabase
        .from("event_participants")
        .select("id, full_name, company, industry")
        .in("id", matchedIds)
    : { data: [] }

  const byId = new Map((matchedParticipants ?? []).map((p) => [p.id, p]))

  // So the Connect button can reflect "Request Sent" / "Connected" instead
  // of always showing "Connect", even after a page refresh.
  const { data: existingConnections } = matchedIds.length
    ? await supabase
        .from("connections")
        .select("requester_id, recipient_id, status")
        .eq("event_id", result.event.id)
        .or(
          `and(requester_id.eq.${me.id},recipient_id.in.(${matchedIds.join(",")})),and(recipient_id.eq.${me.id},requester_id.in.(${matchedIds.join(",")}))`
        )
    : { data: [] }
  const connectionStatusByParticipantId = new Map(
    (existingConnections ?? []).map((c) => [c.requester_id === me.id ? c.recipient_id : c.requester_id, c.status])
  )

  const initial = (me.full_name?.trim()[0] ?? "?").toUpperCase()

  return (
    <div className="-mx-4 flex flex-1 flex-col bg-[var(--cc-surface)]">
      <AppTopBar homeHref={`/join/${eventSlug}/home`} profileHref={`/join/${eventSlug}/profile`} initial={initial} />

      <div className="flex flex-col gap-4 px-4 py-6">
        <div>
          <h1 className="cc-headline text-xl font-bold text-[var(--cc-on-surface)]">AI Matchmaking</h1>
          <p className="text-sm text-[var(--cc-on-surface-variant)]">Your best matches at {result.event.name}</p>
        </div>

        {!matches?.length && (
          <p className="text-sm text-[var(--cc-on-surface-variant)]">
            No matches yet — check back after more participants join.
          </p>
        )}

        {matches?.map((match) => {
          const person = byId.get(match.matched_participant_id)
          if (!person) return null
          return (
            <MatchCard
              key={match.id}
              eventSlug={eventSlug}
              eventId={result.event.id}
              scanHref={`/join/${eventSlug}/connections/scan`}
              match={{
                matchId: match.id,
                participantId: person.id,
                name: person.full_name,
                company: person.company,
                industry: person.industry,
                score: Number(match.score),
                reasons: match.reasons,
                conversationStarter: match.conversation_starter,
                status: match.status,
                connectionStatus: connectionStatusByParticipantId.get(person.id) ?? null,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
