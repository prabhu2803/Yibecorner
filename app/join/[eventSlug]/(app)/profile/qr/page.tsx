import { notFound, redirect } from "next/navigation"

import { MyQrCard } from "@/features/connections/MyQrCard"
import { getBaseUrl } from "@/lib/get-base-url"
import { getEventBySlug } from "@/lib/queries/events"
import { createClient } from "@/lib/supabase/server"

export default async function MyQrPage({
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

  const { data: participant } = await supabase
    .from("event_participants")
    .select("full_name, personal_qr_token")
    .eq("event_id", result.event.id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!participant) redirect(`/join/${eventSlug}/onboard`)

  const baseUrl = await getBaseUrl()
  const scanUrl = `${baseUrl}/join/${eventSlug}/connections/scan?token=${participant.personal_qr_token}`
  const manualCode = participant.personal_qr_token.slice(0, 8).toUpperCase()

  return <MyQrCard scanUrl={scanUrl} manualCode={manualCode} fullName={participant.full_name} />
}
