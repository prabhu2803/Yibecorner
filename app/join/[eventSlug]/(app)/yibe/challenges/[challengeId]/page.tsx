import { notFound, redirect } from "next/navigation"

import { ChallengeDetail, type ResponseView } from "@/features/challenges/ChallengeDetail"
import { getEventBySlug } from "@/lib/queries/events"
import { createClient } from "@/lib/supabase/server"

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ eventSlug: string; challengeId: string }>
}) {
  const { eventSlug, challengeId } = await params
  const result = await getEventBySlug(eventSlug)
  if (!result) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/join/${eventSlug}`)

  const { data: challenge } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .maybeSingle()
  if (!challenge) notFound()

  const { data: me } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", result.event.id)
    .eq("user_id", user.id)
    .maybeSingle()

  const { data: responses } = await supabase
    .from("challenge_responses")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: true })

  const authorIds = Array.from(new Set((responses ?? []).map((r) => r.author_id)))
  const { data: authors } = authorIds.length
    ? await supabase.from("event_participants").select("id, full_name").in("id", authorIds)
    : { data: [] }
  const nameById = new Map((authors ?? []).map((a) => [a.id, a.full_name]))

  const views: ResponseView[] = (responses ?? []).map((r) => ({
    ...r,
    authorName: nameById.get(r.author_id) ?? "Someone",
  }))

  return (
    <ChallengeDetail
      eventSlug={eventSlug}
      challenge={challenge}
      responses={views}
      isAuthor={me?.id === challenge.author_id}
    />
  )
}
