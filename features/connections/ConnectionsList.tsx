"use client"

import * as React from "react"
import { CheckCircle2, Clock, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/shared/GlassCard"
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
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-xl font-bold">My Connections</h1>

      {pendingForMe.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Confirm these</h2>
          {pendingForMe.map((c) => (
            <GlassCard key={c.id} className="flex items-center justify-between py-3">
              <span className="font-medium">{c.otherName}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => respond(c.id, "reject")}>
                  <XCircle className="size-4" />
                </Button>
                <Button size="sm" onClick={() => respond(c.id, "confirm")}>
                  <CheckCircle2 className="size-4" />
                  Confirm
                </Button>
              </div>
            </GlassCard>
          ))}
        </section>
      )}

      {waitingOnThem.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Waiting for them to confirm</h2>
          {waitingOnThem.map((c) => (
            <GlassCard key={c.id} className="flex items-center justify-between py-3 text-muted-foreground">
              <span>{c.otherName}</span>
              <Clock className="size-4" />
            </GlassCard>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Verified Connections ({verified.length})
        </h2>
        {verified.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No verified connections yet — scan someone&apos;s QR to get started.
          </p>
        ) : (
          verified.map((c) => (
            <GlassCard key={c.id} className="flex items-center gap-3 py-3">
              <CheckCircle2 className="size-5 text-accent" />
              <span className="font-medium">{c.otherName}</span>
            </GlassCard>
          ))
        )}
      </section>
    </div>
  )
}
