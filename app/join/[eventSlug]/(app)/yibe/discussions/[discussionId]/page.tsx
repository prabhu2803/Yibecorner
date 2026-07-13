import { notFound, redirect } from "next/navigation"

import { DiscussionDetail } from "@/features/discussions/DiscussionDetail"
import { getEventBySlug } from "@/lib/queries/events"
import { createClient } from "@/lib/supabase/server"

export default async function DiscussionDetailPage({
  params,
}: {
  params: Promise<{ eventSlug: string; discussionId: string }>
}) {
  const { eventSlug, discussionId } = await params
  const result = await getEventBySlug(eventSlug)
  if (!result) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/join/${eventSlug}`)

  const { data: discussion } = await supabase
    .from("discussions")
    .select("*")
    .eq("id", discussionId)
    .maybeSingle()
  if (!discussion) notFound()

  const { data: me } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", result.event.id)
    .eq("user_id", user.id)
    .maybeSingle()

  const { data: members } = await supabase
    .from("discussion_members")
    .select("participant_id")
    .eq("discussion_id", discussionId)

  const memberIds = (members ?? []).map((m) => m.participant_id)
  const { data: memberParticipants } = memberIds.length
    ? await supabase.from("event_participants").select("id, full_name").in("id", memberIds)
    : { data: [] }

  const isMember = Boolean(me && memberIds.includes(me.id))

  return (
    <DiscussionDetail
      eventSlug={eventSlug}
      discussion={discussion}
      memberNames={(memberParticipants ?? []).map((p) => p.full_name)}
      isMember={isMember}
    />
  )
}
