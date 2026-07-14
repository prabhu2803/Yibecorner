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
    ? await supabase
        .from("event_participants")
        .select("id, full_name, company, designation, industry")
        .in("id", otherIds)
    : { data: [] }

  const otherById = new Map((others ?? []).map((o) => [o.id, o]))

  // Contact numbers are only fetchable for participants we have an
  // *accepted* connection with (see 0022_participant_contacts_connected_select.sql)
  // — scoping the query to just those ids keeps it aligned with what RLS
  // actually allows, rather than relying on RLS to silently filter rows.
  const acceptedOtherIds = Array.from(
    new Set(
      (connections ?? [])
        .filter((c) => c.status === "accepted")
        .map((c) => (c.requester_id === me.id ? c.recipient_id : c.requester_id))
    )
  )
  const { data: contacts } = acceptedOtherIds.length
    ? await supabase.from("participant_contacts").select("participant_id, whatsapp_number").in("participant_id", acceptedOtherIds)
    : { data: [] }
  const whatsappByParticipantId = new Map((contacts ?? []).map((c) => [c.participant_id, c.whatsapp_number]))

  const views: ConnectionView[] = (connections ?? []).map((c) => {
    const otherIsRequester = c.requester_id !== me.id
    const otherId = otherIsRequester ? c.requester_id : c.recipient_id
    const other = otherById.get(otherId)
    return {
      ...c,
      otherName: other?.full_name ?? "Someone",
      otherIsRequester,
      otherCompany: other?.company ?? null,
      otherDesignation: other?.designation ?? null,
      otherIndustry: other?.industry ?? null,
      otherWhatsapp: whatsappByParticipantId.get(otherId) ?? null,
    }
  })

  const initial = (me.full_name?.trim()[0] ?? "?").toUpperCase()

  return (
    <div className="-mx-4 flex flex-1 flex-col bg-[var(--cc-surface)]">
      <AppTopBar homeHref={`/join/${eventSlug}/home`} profileHref={`/join/${eventSlug}/profile`} initial={initial} />
      <ConnectionsList participantId={me.id} initialConnections={views} />
    </div>
  )
}
