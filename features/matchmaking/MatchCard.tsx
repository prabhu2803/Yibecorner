"use client"

import * as React from "react"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/shared/GlassCard"
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
    <GlassCard className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{match.name}</p>
          <p className="text-xs text-muted-foreground">
            {match.company ? `${match.company} · ` : ""}
            {match.industry.replace(/_/g, " ")}
          </p>
        </div>
        <Badge className="glow-amber gap-1 bg-accent text-accent-foreground">
          <Sparkles className="size-3" />
          {Math.round(match.score)}% match
        </Badge>
      </div>

      <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
        {match.reasons.map((reason, i) => (
          <li key={i}>• {reason}</li>
        ))}
      </ul>

      {match.conversationStarter && (
        <p className="rounded-lg bg-white/5 p-3 text-sm italic">
          &ldquo;{match.conversationStarter}&rdquo;
        </p>
      )}

      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={status === "connect_requested" || pending}
          onClick={handleConnect}
        >
          {status === "connect_requested" ? "Marked as priority" : "Connect"}
        </Button>
        <Link href={scanHref}>
          <Button variant="outline">Scan QR</Button>
        </Link>
      </div>
    </GlassCard>
  )
}
