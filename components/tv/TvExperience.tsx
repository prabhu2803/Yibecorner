"use client"

import * as React from "react"

import { HeroIntro } from "@/components/tv/HeroIntro"
import { LiveLanding } from "@/components/tv/LiveLanding"
import { useRealtimeCounters } from "@/hooks/use-realtime-counters"
import { useScreenCommands, type ScreenSettingsState } from "@/hooks/use-screen-commands"
import type { Database } from "@/types/database.types"

type EventRow = Database["public"]["Tables"]["events"]["Row"]
type EventStats = Database["public"]["Tables"]["event_stats"]["Row"]
type EventSettingsRow = Database["public"]["Tables"]["event_settings"]["Row"]

export function TvExperience({
  event,
  initialSettings,
  initialStats,
  joinUrl,
}: {
  event: EventRow
  initialSettings: EventSettingsRow | null
  initialStats: EventStats | null
  joinUrl: string
}) {
  const settingsSeed: ScreenSettingsState = {
    showQr: initialSettings?.show_qr ?? true,
    showParticipantNames: initialSettings?.show_participant_names ?? true,
    emergencyStaticMode: initialSettings?.emergency_static_mode ?? false,
  }

  const [showIntro, setShowIntro] = React.useState(true)
  const stats = useRealtimeCounters(event.id, initialStats)
  const { settings, announcement } = useScreenCommands(event.id, settingsSeed, () =>
    setShowIntro(true)
  )

  return (
    <>
      {showIntro && <HeroIntro onComplete={() => setShowIntro(false)} />}
      {!showIntro && (
        <LiveLanding
          event={event}
          stats={stats}
          showQr={settings.showQr}
          showParticipantNames={settings.showParticipantNames}
          emergencyStaticMode={settings.emergencyStaticMode}
          announcement={announcement}
          joinUrl={joinUrl}
        />
      )}
    </>
  )
}
