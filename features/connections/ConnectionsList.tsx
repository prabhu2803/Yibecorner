"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"
import { realtimeChannels } from "@/lib/realtime/channels"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database.types"

type ConnectionRow = Database["public"]["Tables"]["connections"]["Row"]

export interface ConnectionView extends ConnectionRow {
  otherName: string
  otherIsRequester: boolean
}

export function ConnectionsList({
  participantId,
  initialConnections,
}: {
  participantId: string
  initialConnections: ConnectionView[]
}) {
  const [connections, setConnections] = React.useState(initialConnections)

  React.useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(realtimeChannels.connections(participantId))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
          filter: `recipient_id=eq.${participantId}`,
        },
        (payload) => applyChange(payload.new as ConnectionRow)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
          filter: `requester_id=eq.${participantId}`,
        },
        (payload) => applyChange(payload.new as ConnectionRow)
      )
      .subscribe()

    function applyChange(row: ConnectionRow) {
      setConnections((prev) => {
        const existing = prev.find((c) => c.id === row.id)
        if (existing) {
          return prev.map((c) => (c.id === row.id ? { ...c, ...row } : c))
        }
        // A brand new row from realtime won't have `otherName` resolved yet;
        // the next full refresh (navigation) will pick up the display name.
        return [{ ...row, otherName: "Someone", otherIsRequester: row.requester_id !== participantId }, ...prev]
      })
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [participantId])

  async function respond(connectionId: string, action: "confirm" | "reject") {
    const res = await fetch("/api/connections/verify", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId, action }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? "Could not update connection")
      return
    }
    toast.success(action === "confirm" ? "Connection verified!" : "Request dismissed")
  }

  const pendingForMe = connections.filter((c) => c.status === "pending" && c.recipient_id === participantId)
  const verified = connections.filter((c) => c.status === "verified")
  const waitingOnThem = connections.filter((c) => c.status === "pending" && c.requester_id === participantId)

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <h1 className="cc-headline text-xl font-bold text-[var(--cc-on-surface)]">My Connections</h1>

      {pendingForMe.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="cc-label-tech text-[11px] tracking-widest text-[var(--cc-on-surface-variant)] uppercase">
            Confirm these
          </h2>
          {pendingForMe.map((c) => (
            <div key={c.id} className="cc-glass-panel flex items-center justify-between rounded-2xl px-4 py-3">
              <span className="font-medium text-[var(--cc-on-surface)]">{c.otherName}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="cc-glass-panel rounded-xl p-0 text-[var(--cc-on-surface-variant)]"
                  onClick={() => respond(c.id, "reject")}
                >
                  <MaterialIcon name="close" className="text-[16px]" />
                </Button>
                <Button
                  size="sm"
                  className="cc-neon-primary gap-1 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
                  onClick={() => respond(c.id, "confirm")}
                >
                  <MaterialIcon name="check_circle" className="text-[16px]" />
                  Confirm
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}

      {waitingOnThem.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="cc-label-tech text-[11px] tracking-widest text-[var(--cc-on-surface-variant)] uppercase">
            Waiting for them to confirm
          </h2>
          {waitingOnThem.map((c) => (
            <div
              key={c.id}
              className="cc-glass-panel flex items-center justify-between rounded-2xl px-4 py-3 text-[var(--cc-on-surface-variant)]"
            >
              <span>{c.otherName}</span>
              <MaterialIcon name="schedule" className="text-[18px]" />
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="cc-label-tech text-[11px] tracking-widest text-[var(--cc-on-surface-variant)] uppercase">
          Verified Connections ({verified.length})
        </h2>
        {verified.length === 0 ? (
          <p className="text-sm text-[var(--cc-on-surface-variant)]">
            No verified connections yet — scan someone&apos;s QR to get started.
          </p>
        ) : (
          verified.map((c) => (
            <div key={c.id} className="cc-glass-panel flex items-center gap-3 rounded-2xl px-4 py-3">
              <MaterialIcon name="check_circle" className="text-[20px] text-[var(--cc-secondary)]" />
              <span className="font-medium text-[var(--cc-on-surface)]">{c.otherName}</span>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
