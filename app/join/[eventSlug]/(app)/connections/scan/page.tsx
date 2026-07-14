"use client"

import { useParams } from "next/navigation"

import { ScanFlow } from "@/features/connections/ScanFlow"
import { useParticipantSession } from "@/features/session/ParticipantSessionProvider"

export default function ScanPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>()
  const { event, participant } = useParticipantSession()
  const initial = (participant?.full_name?.trim()[0] ?? "?").toUpperCase()
  return <ScanFlow eventSlug={eventSlug} eventId={event.id} initial={initial} />
}
