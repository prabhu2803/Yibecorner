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
  otherCompany: string | null
  otherDesignation: string | null
  otherIndustry: string | null
  otherWhatsapp: string | null
}

// wa.me wants digits only — no "+", spaces, or punctuation — unlike the
// stored value, which keeps a leading "+" when the user entered one.
function toWaNumber(raw: string): string {
  return raw.replace(/\D/g, "")
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
        // A brand new row from realtime won't have `otherName`/contact info
        // resolved yet; the next full refresh (navigation) will pick those up.
        return [
          {
            ...row,
            otherName: "Someone",
            otherIsRequester: row.requester_id !== participantId,
            otherCompany: null,
            otherDesignation: null,
            otherIndustry: null,
            otherWhatsapp: null,
          },
          ...prev,
        ]
      })
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [participantId])

  async function respond(connectionId: string, action: "accept" | "decline") {
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
    toast.success(action === "accept" ? "🎉 Connection accepted!" : "Request declined")
  }

  const pendingForMe = connections.filter((c) => c.status === "pending" && c.recipient_id === participantId)
  const accepted = connections.filter((c) => c.status === "accepted")
  const waitingOnThem = connections.filter((c) => c.status === "pending" && c.requester_id === participantId)

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <h1 className="cc-headline text-xl font-bold text-[var(--cc-on-surface)]">My Connections</h1>

      {pendingForMe.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="cc-label-tech text-[11px] tracking-widest text-[var(--cc-on-surface-variant)] uppercase">
            Connection Requests
          </h2>
          {pendingForMe.map((c) => (
            <div key={c.id} className="cc-glass-panel flex flex-col gap-3 rounded-2xl px-4 py-3">
              <div>
                <p className="font-medium text-[var(--cc-on-surface)]">{c.otherName} would like to connect</p>
                <p className="text-xs text-[var(--cc-on-surface-variant)]">
                  Our AI matched you both based on complementary business goals.
                </p>
                {c.message && (
                  <p className="mt-2 rounded-lg bg-[rgba(93,230,255,0.06)] p-2 text-sm text-[var(--cc-on-surface)] italic">
                    &ldquo;{c.message}&rdquo;
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="cc-glass-panel flex-1 rounded-xl text-[var(--cc-on-surface-variant)]"
                  onClick={() => respond(c.id, "decline")}
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  className="cc-neon-primary flex-1 gap-1 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
                  onClick={() => respond(c.id, "accept")}
                >
                  <MaterialIcon name="check_circle" className="text-[16px]" />
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}

      {waitingOnThem.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="cc-label-tech text-[11px] tracking-widest text-[var(--cc-on-surface-variant)] uppercase">
            Waiting for them to respond
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
          Accepted Connections ({accepted.length})
        </h2>
        {accepted.length === 0 ? (
          <p className="text-sm text-[var(--cc-on-surface-variant)]">
            No accepted connections yet — tap Connect on a match, or scan someone&apos;s QR, to get started.
          </p>
        ) : (
          accepted.map((c) => (
            <div key={c.id} className="cc-glass-panel flex items-center gap-3 rounded-2xl px-4 py-3">
              <MaterialIcon name="check_circle" className="shrink-0 text-[20px] text-[var(--cc-secondary)]" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[var(--cc-on-surface)]">{c.otherName}</p>
                {(c.otherDesignation || c.otherCompany) && (
                  <p className="truncate text-xs text-[var(--cc-on-surface-variant)]">
                    {c.otherDesignation}
                    {c.otherDesignation && c.otherCompany ? " · " : ""}
                    {c.otherCompany}
                  </p>
                )}
                {c.otherIndustry && (
                  <p className="text-[11px] text-[var(--cc-on-surface-variant)] capitalize">
                    {c.otherIndustry.replace(/_/g, " ")}
                  </p>
                )}
              </div>
              {c.otherWhatsapp && (
                <a
                  href={`https://wa.me/${toWaNumber(c.otherWhatsapp)}?text=${encodeURIComponent(
                    `Hi ${c.otherName.split(" ")[0]}, great connecting at Vibe Corner!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`WhatsApp ${c.otherName}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366] transition hover:bg-[#25D366]/25"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px]">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.38a9.9 9.9 0 0 0 4.76 1.21h.01c5.46 0 9.9-4.45 9.9-9.92 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.26.86 5.82 2.42a8.2 8.2 0 0 1 2.42 5.82c0 4.54-3.7 8.24-8.25 8.24a8.3 8.3 0 0 1-4.2-1.15l-.3-.18-3.13.82.84-3.05-.2-.32a8.2 8.2 0 0 1-1.26-4.38c0-4.55 3.7-8.25 8.26-8.25v.03Zm-4.5 4.66c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.35.99 2.51c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.34-.76-1.83-.2-.48-.4-.42-.55-.42h-.47Z" />
                  </svg>
                </a>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  )
}
