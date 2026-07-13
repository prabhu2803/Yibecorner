"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"

import { useParticipantSession } from "@/features/session/ParticipantSessionProvider"
import { VibiMascot } from "@/features/vibi/VibiMascot"

export default function JoinEntryPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>()
  const router = useRouter()
  const { participant } = useParticipantSession()

  React.useEffect(() => {
    const destination = participant?.onboarding_completed_at
      ? `/join/${eventSlug}/home`
      : `/join/${eventSlug}/onboard`
    router.replace(destination)
  }, [participant, eventSlug, router])

  return (
    <div className="flex flex-1 items-center justify-center">
      <VibiMascot state="idle" size={96} />
    </div>
  )
}
