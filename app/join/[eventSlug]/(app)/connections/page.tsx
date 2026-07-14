import { notFound, redirect } from "next/navigation"

import { AppTopBar } from "@/components/shared/AppTopBar"
import { ConnectionsList, type ConnectionView } from "@/features/connections/ConnectionsList"
import { getEventBySlug } from "@/lib/queries/events"
import { createClient } from "@/lib/supabase/server"

export default async function ConnectionsPage({
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

  const { data: connections } = await supabase
    .from("connections")
    .select("*")
    .eq("event_id", result.event.id)
    .or(`requester_id.eq.${me.id},recipient_id.eq.${me.id}`)
    .order("scanned_at", { ascending: false })

  const otherIds = Array.from(
    new Set(
      (connections ?? []).map((c) => (c.requester_id === me.id ? c.recipient_id : c.requester_id))
    )
  )

  const { data: others } = otherIds.length
    ? await supabase.from("event_participants").select("id, full_name").in("id", otherIds)
    : { data: [] }

  const nameById = new Map((others ?? []).map((o) => [o.id, o.full_name]))

  const views: ConnectionView[] = (connections ?? []).map((c) => {
    const otherIsRequester = c.requester_id !== me.id
    const otherId = otherIsRequester ? c.requester_id : c.recipient_id
    return { ...c, otherName: nameById.get(otherId) ?? "Someone", otherIsRequester }
  })

  const initial = (me.full_name?.trim()[0] ?? "?").toUpperCase()

  return (
    <div className="-mx-4 flex flex-1 flex-col bg-[var(--cc-surface)]">
      <AppTopBar homeHref={`/join/${eventSlug}/home`} profileHref={`/join/${eventSlug}/profile`} initial={initial} />
      <ConnectionsList participantId={me.id} initialConnections={views} />
    </div>
  )
}
