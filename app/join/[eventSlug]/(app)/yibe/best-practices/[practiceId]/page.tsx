import { notFound, redirect } from "next/navigation"

import { BestPracticeDetail, type CommentView } from "@/features/best-practices/BestPracticeDetail"
import { getEventBySlug } from "@/lib/queries/events"
import { createClient } from "@/lib/supabase/server"

export default async function BestPracticeDetailPage({
  params,
}: {
  params: Promise<{ eventSlug: string; practiceId: string }>
}) {
  const { eventSlug, practiceId } = await params
  const result = await getEventBySlug(eventSlug)
  if (!result) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/join/${eventSlug}`)

  const { data: practice } = await supabase
    .from("best_practices")
    .select("*")
    .eq("id", practiceId)
    .maybeSingle()
  if (!practice) notFound()

  const { data: me } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", result.event.id)
    .eq("user_id", user.id)
    .maybeSingle()

  const [{ data: comments }, upvoteCheck, saveCheck] = await Promise.all([
    supabase
      .from("best_practice_comments")
      .select("*")
      .eq("best_practice_id", practiceId)
      .order("created_at", { ascending: true }),
    me
      ? supabase
          .from("best_practice_upvotes")
          .select("participant_id")
          .eq("best_practice_id", practiceId)
          .eq("participant_id", me.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    me
      ? supabase
          .from("best_practice_saves")
          .select("participant_id")
          .eq("best_practice_id", practiceId)
          .eq("participant_id", me.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const authorIds = Array.from(new Set((comments ?? []).map((c) => c.author_id)))
  const { data: authors } = authorIds.length
    ? await supabase.from("event_participants").select("id, full_name").in("id", authorIds)
    : { data: [] }
  const nameById = new Map((authors ?? []).map((a) => [a.id, a.full_name]))

  const commentViews: CommentView[] = (comments ?? []).map((c) => ({
    ...c,
    authorName: nameById.get(c.author_id) ?? "Someone",
  }))

  return (
    <BestPracticeDetail
      eventSlug={eventSlug}
      practice={practice}
      comments={commentViews}
      initiallyUpvoted={Boolean(upvoteCheck.data)}
      initiallySaved={Boolean(saveCheck.data)}
    />
  )
}
