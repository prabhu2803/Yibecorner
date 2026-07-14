"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"
import { markMatchConnectRequested } from "@/features/matchmaking/mutations"

export interface MatchCardData {
  matchId: string
  name: string
  company: string | null
  industry: string
  score: number
  reasons: string[]
  conversationStarter: string | null
  status: string
}

export function MatchCard({ match, scanHref }: { match: MatchCardData; scanHref: string }) {
  const [status, setStatus] = React.useState(match.status)
  const [pending, setPending] = React.useState(false)

  async function handleConnect() {
    setPending(true)
    const result = await markMatchConnectRequested(match.matchId)
    setPending(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setStatus("connect_requested")
    toast.success(`Marked ${match.name} as a priority — find them and scan their QR!`)
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
        <Button
          className="cc-neon-primary flex-1 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
          disabled={status === "connect_requested" || pending}
          onClick={handleConnect}
        >
          {status === "connect_requested" ? "Marked as priority" : "Connect"}
        </Button>
        <Link href={scanHref}>
          <Button className="cc-glass-panel rounded-xl text-[var(--cc-on-surface)]">Scan QR</Button>
        </Link>
      </div>
    </div>
  )
}
