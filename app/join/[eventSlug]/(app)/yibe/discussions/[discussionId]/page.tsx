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

  const { data: messages } = await supabase
    .from("discussion_messages")
    .select("*")
    .eq("discussion_id", discussionId)
    .order("created_at", { ascending: true })

  const messageAuthorIds = Array.from(new Set((messages ?? []).map((m) => m.author_id)))
  const { data: messageAuthors } = messageAuthorIds.length
    ? await supabase.from("event_participants").select("id, full_name").in("id", messageAuthorIds)
    : { data: [] }
  const nameById = new Map((messageAuthors ?? []).map((a) => [a.id, a.full_name]))

  const messageViews = (messages ?? []).map((m) => ({
    ...m,
    authorName: nameById.get(m.author_id) ?? "Someone",
  }))

  // So each member badge / message author's Connect button can reflect
  // "Requested" / "Connected" instead of always showing the plain "+",
  // even after a page refresh — same pattern as the Matches page.
  const otherPeopleIds = Array.from(new Set([...memberIds, ...messageAuthorIds])).filter((id) => id !== me?.id)
  const { data: existingConnections } = me && otherPeopleIds.length
    ? await supabase
        .from("connections")
        .select("requester_id, recipient_id, status")
        .eq("event_id", result.event.id)
        .or(
          `and(requester_id.eq.${me.id},recipient_id.in.(${otherPeopleIds.join(",")})),and(recipient_id.eq.${me.id},requester_id.in.(${otherPeopleIds.join(",")}))`
        )
    : { data: [] }
  const connectionStatusByParticipantId = new Map(
    (existingConnections ?? []).map((c) => [c.requester_id === me?.id ? c.recipient_id : c.requester_id, c.status])
  )

  return (
    <DiscussionDetail
      eventSlug={eventSlug}
      eventId={result.event.id}
      meId={me?.id ?? null}
      discussion={discussion}
      members={(memberParticipants ?? []).map((p) => ({
        id: p.id,
        name: p.full_name,
        connectionStatus: connectionStatusByParticipantId.get(p.id) ?? null,
      }))}
      isMember={isMember}
      messages={messageViews.map((m) => ({
        ...m,
        connectionStatus: connectionStatusByParticipantId.get(m.author_id) ?? null,
      }))}
    />
  )
}
