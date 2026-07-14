"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"
import { sendConnectionRequest } from "@/features/connections/actions"

export interface MatchCardData {
  matchId: string
  participantId: string
  name: string
  company: string | null
  industry: string
  score: number
  reasons: string[]
  conversationStarter: string | null
  status: string
  /** null = never interacted; otherwise the connections-table status. */
  connectionStatus: "pending" | "accepted" | "declined" | "expired" | null
}

const CONNECT_BUTTON_COPY: Record<string, string> = {
  pending: "Request Sent",
  accepted: "Connected",
  declined: "Connect",
  expired: "Connect",
}

export function MatchCard({
  match,
  eventSlug,
  eventId,
  scanHref,
}: {
  match: MatchCardData
  eventSlug: string
  eventId: string
  scanHref: string
}) {
  const [connectionStatus, setConnectionStatus] = React.useState(match.connectionStatus)
  const [open, setOpen] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const [sending, setSending] = React.useState(false)

  const alreadyActedOn = connectionStatus === "pending" || connectionStatus === "accepted"

  async function handleSend() {
    setSending(true)
    const result = await sendConnectionRequest(eventSlug, eventId, {
      recipientParticipantId: match.participantId,
      message,
      initiatedVia: "match",
    })
    setSending(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setConnectionStatus("pending")
    setOpen(false)
    setMessage("")
    toast.success(`Request sent to ${match.name} — find them and say hi!`)
  }

  return (
    <div className="cc-glass-panel flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="cc-headline font-semibold text-[var(--cc-on-surface)]">{match.name}</p>
          <p className="text-xs text-[var(--cc-on-surface-variant)]">
            {match.company ? `${match.company} · ` : ""}
            {match.industry.replace(/_/g, " ")}
          </p>
        </div>
        <div className="cc-neon-primary flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] px-3 py-1 text-[var(--cc-on-primary)]">
          <MaterialIcon name="auto_awesome" className="text-[14px]" />
          <span className="cc-label-tech text-[11px] font-bold">{Math.round(match.score)}%</span>
        </div>
      </div>

      <ul className="flex flex-col gap-1 text-sm text-[var(--cc-on-surface-variant)]">
        {match.reasons.map((reason, i) => (
          <li key={i}>• {reason}</li>
        ))}
      </ul>

      {match.conversationStarter && (
        <p className="rounded-lg bg-[rgba(93,230,255,0.06)] p-3 text-sm text-[var(--cc-on-surface)] italic">
          &ldquo;{match.conversationStarter}&rdquo;
        </p>
      )}

      <div className="flex gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="cc-neon-primary flex-1 gap-1.5 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
              disabled={alreadyActedOn}
            >
              <MaterialIcon name="handshake" className="text-[16px]" />
              {CONNECT_BUTTON_COPY[connectionStatus ?? ""] ?? "Connect"}
            </Button>
          </DialogTrigger>
          <DialogContent className="cc-scope rounded-2xl border border-white/10 bg-[var(--cc-surface)] text-[var(--cc-on-surface)]">
            <DialogHeader>
              <DialogTitle className="cc-headline text-base font-bold text-[var(--cc-on-surface)]">
                Connect with {match.name}?
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-[var(--cc-on-surface-variant)]">
              Our AI believes both of you could create meaningful value together.
            </p>
            <Textarea
              placeholder="Optional message, e.g. I'd love to discuss AI for manufacturing."
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <DialogFooter className="rounded-b-2xl border-t border-white/10 bg-transparent">
              <Button
                className="cc-glass-panel rounded-xl text-[var(--cc-on-surface-variant)]"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={sending}
                onClick={handleSend}
                className="cc-neon-primary rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
              >
                {sending ? "Sending..." : "Send Connection Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Link href={scanHref}>
          <Button className="cc-glass-panel rounded-xl text-[var(--cc-on-surface)]">Scan QR</Button>
        </Link>
      </div>
    </div>
  )
}
