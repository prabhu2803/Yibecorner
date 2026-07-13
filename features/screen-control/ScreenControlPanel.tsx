"use client"

import * as React from "react"
import {
  RotateCcw,
  QrCode,
  EyeOff,
  PartyPopper,
  Megaphone,
  UserRoundX,
  ShieldAlert,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { issueScreenCommand } from "@/features/screen-control/actions"
import type { Json } from "@/types/database.types"

export function ScreenControlPanel({ eventId }: { eventId: string }) {
  const [announcement, setAnnouncement] = React.useState("")
  const [namesHidden, setNamesHidden] = React.useState(false)
  const [staticMode, setStaticMode] = React.useState(false)
  const [pending, setPending] = React.useState<string | null>(null)

  async function fire(
    key: string,
    commandType: Parameters<typeof issueScreenCommand>[1],
    payload?: Record<string, Json>
  ) {
    setPending(key)
    const result = await issueScreenCommand(eventId, commandType, payload)
    setPending(null)
    if (!result.success) toast.error(result.error)
    else toast.success("Sent to screen")
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="admin-surface flex flex-col gap-3 p-4">
        <h2 className="font-semibold">Intro</h2>
        <Button
          disabled={pending === "replay_intro"}
          onClick={() => fire("replay_intro", "replay_intro")}
          className="gap-2"
        >
          <RotateCcw className="size-4" /> Replay Intro
        </Button>
      </div>

      <div className="admin-surface flex flex-col gap-3 p-4">
        <h2 className="font-semibold">QR Visibility</h2>
        <div className="flex gap-2">
          <Button variant="outline" disabled={pending === "show_qr"} onClick={() => fire("show_qr", "show_qr")} className="flex-1 gap-2">
            <QrCode className="size-4" /> Show QR
          </Button>
          <Button variant="outline" disabled={pending === "hide_qr"} onClick={() => fire("hide_qr", "hide_qr")} className="flex-1 gap-2">
            <EyeOff className="size-4" /> Hide QR
          </Button>
        </div>
      </div>

      <div className="admin-surface flex flex-col gap-3 p-4">
        <h2 className="font-semibold">Celebration</h2>
        <Button
          disabled={pending === "trigger_celebration"}
          onClick={() => fire("trigger_celebration", "trigger_celebration")}
          className="glow-amber gap-2"
        >
          <PartyPopper className="size-4" /> Trigger Celebration
        </Button>
      </div>

      <div className="admin-surface flex flex-col gap-3 p-4">
        <h2 className="font-semibold">Announcement</h2>
        <Input
          placeholder="e.g. Lunch is served in the main hall"
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
        />
        <Button
          disabled={announcement.length < 2 || pending === "trigger_announcement"}
          onClick={() =>
            fire("trigger_announcement", "trigger_announcement", { text: announcement, duration_ms: 8000 })
          }
          className="gap-2"
        >
          <Megaphone className="size-4" /> Announce
        </Button>
      </div>

      <div className="admin-surface flex flex-col gap-3 p-4">
        <h2 className="font-semibold">Participant Names</h2>
        <Button
          variant="outline"
          disabled={pending === "toggle_participant_names"}
          onClick={() => {
            const next = !namesHidden
            setNamesHidden(next)
            fire("toggle_participant_names", "toggle_participant_names", { visible: !next })
          }}
          className="gap-2"
        >
          <UserRoundX className="size-4" /> {namesHidden ? "Show Names" : "Hide Names"}
        </Button>
      </div>

      <div className="admin-surface flex flex-col gap-3 p-4">
        <h2 className="font-semibold text-destructive">Emergency Static Mode</h2>
        <Button
          variant="destructive"
          disabled={pending === "emergency_static_mode"}
          onClick={() => {
            const next = !staticMode
            setStaticMode(next)
            fire("emergency_static_mode", "emergency_static_mode", { enabled: next })
          }}
          className="gap-2"
        >
          <ShieldAlert className="size-4" /> {staticMode ? "Disable Static Mode" : "Enable Static Mode"}
        </Button>
      </div>
    </div>
  )
}
