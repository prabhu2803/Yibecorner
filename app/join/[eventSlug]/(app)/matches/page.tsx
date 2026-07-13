import { notFound, redirect } from "next/navigation"

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
    .select("id")
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

  return (
    <div className="flex flex-col gap-4 py-6">
      <div>
        <h1 className="text-xl font-bold">AI Matchmaking</h1>
        <p className="text-sm text-muted-foreground">Your best matches at {result.event.name}</p>
      </div>

      {!matches?.length && (
        <p className="text-sm text-muted-foreground">
          No matches yet — check back after more participants join.
        </p>
      )}

      {matches?.map((match) => {
        const person = byId.get(match.matched_participant_id)
        if (!person) return null
        return (
          <MatchCard
            key={match.id}
            scanHref={`/join/${eventSlug}/connections/scan`}
            match={{
              matchId: match.id,
              name: person.full_name,
              company: person.company,
              industry: person.industry,
              score: Number(match.score),
              reasons: match.reasons,
              conversationStarter: match.conversation_starter,
              status: match.status,
            }}
          />
        )
      })}
    </div>
  )
}
