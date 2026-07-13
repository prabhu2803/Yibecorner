"use client"

import * as React from "react"

import { useVibiState } from "@/features/vibi/useVibiState"
import { realtimeChannels } from "@/lib/realtime/channels"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database.types"

type ScreenCommandRow = Database["public"]["Tables"]["screen_commands"]["Row"]
type ActivityRow = Database["public"]["Tables"]["screen_activity_queue"]["Row"]

export interface ScreenSettingsState {
  showQr: boolean
  showParticipantNames: boolean
  emergencyStaticMode: boolean
}

export interface Announcement {
  id: string
  text: string
  durationMs: number
}

/**
 * The TV's single realtime surface: one channel carrying both admin-issued
 * commands and trigger-written activity rows. See design.md "Realtime
 * channel design" — the TV never subscribes to raw business tables.
 */
export function useScreenCommands(
  eventId: string,
  initialSettings: ScreenSettingsState,
  onReplayIntro?: () => void
) {
  const [settings, setSettings] = React.useState(initialSettings)
  const [announcement, setAnnouncement] = React.useState<Announcement | null>(null)
  const [latestActivity, setLatestActivity] = React.useState<ActivityRow | null>(null)
  const react = useVibiState((s) => s.react)
  const onReplayIntroRef = React.useRef(onReplayIntro)
  React.useEffect(() => {
    onReplayIntroRef.current = onReplayIntro
  }, [onReplayIntro])

  const applyCommand = React.useCallback(
    (command: ScreenCommandRow) => {
      switch (command.command_type) {
        case "show_qr":
          setSettings((s) => ({ ...s, showQr: true }))
          break
        case "hide_qr":
          setSettings((s) => ({ ...s, showQr: false }))
          break
        case "toggle_participant_names": {
          const visible = (command.payload as { visible?: boolean })?.visible
          setSettings((s) => ({ ...s, showParticipantNames: visible ?? !s.showParticipantNames }))
          break
        }
        case "emergency_static_mode": {
          const enabled = (command.payload as { enabled?: boolean })?.enabled
          setSettings((s) => ({ ...s, emergencyStaticMode: enabled ?? !s.emergencyStaticMode }))
          break
        }
        case "trigger_celebration":
          react("celebrate")
          break
        case "trigger_announcement": {
          const payload = command.payload as { text?: string; duration_ms?: number }
          if (payload?.text) {
            setAnnouncement({
              id: command.id,
              text: payload.text,
              durationMs: payload.duration_ms ?? 6000,
            })
          }
          break
        }
        case "replay_intro":
          onReplayIntroRef.current?.()
          break
      }
    },
    [react]
  )

  React.useEffect(() => {
    if (!announcement) return
    const timeout = setTimeout(() => setAnnouncement(null), announcement.durationMs)
    return () => clearTimeout(timeout)
  }, [announcement])

  React.useEffect(() => {
    const supabase = createClient()

    // Bounded historical catch-up: only pending commands + last 5 activity
    // rows, never a full replay (a refreshed TV shouldn't re-fire every
    // celebration that ever happened at this event).
    void (async () => {
      const { data: pendingCommands } = await supabase
        .from("screen_commands")
        .select("*")
        .eq("event_id", eventId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })

      pendingCommands?.forEach(applyCommand)

      const { data: recentActivity } = await supabase
        .from("screen_activity_queue")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(5)

      const mostRecent = recentActivity?.[0]
      if (mostRecent?.vibi_state) {
        react(mostRecent.vibi_state)
        setLatestActivity(mostRecent)
      }
    })()

    const channel = supabase
      .channel(realtimeChannels.screen(eventId))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "screen_commands",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const command = payload.new as ScreenCommandRow
          applyCommand(command)
          void supabase
            .from("screen_commands")
            .update({ status: "acknowledged", delivered_at: new Date().toISOString() })
            .eq("id", command.id)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "screen_activity_queue",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const activity = payload.new as ActivityRow
          setLatestActivity(activity)
          if (activity.vibi_state) react(activity.vibi_state)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, applyCommand, react])

  return { settings, announcement, latestActivity }
}
