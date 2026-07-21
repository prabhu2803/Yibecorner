"use client"

import * as React from "react"
import { CheckCircle2, HandHeart } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { GlassCard } from "@/components/shared/GlassCard"
import { createChallengeResponse, markChallengeSolved } from "@/features/challenges/actions"
import { realtimeChannels } from "@/lib/realtime/channels"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database.types"

type ChallengeRow = Database["public"]["Tables"]["challenges"]["Row"]
type ResponseRow = Database["public"]["Tables"]["challenge_responses"]["Row"]

export interface ResponseView extends ResponseRow {
  authorName: string
}

export function ChallengeDetail({
  eventSlug,
  challenge: initialChallenge,
  authorName,
  responses: initialResponses,
  isAuthor,
}: {
  eventSlug: string
  challenge: ChallengeRow
  authorName: string
  responses: ResponseView[]
  isAuthor: boolean
}) {
  const [challenge, setChallenge] = React.useState(initialChallenge)
  const [responses, setResponses] = React.useState(initialResponses)
  const [body, setBody] = React.useState("")
  const [isIntro, setIsIntro] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(realtimeChannels.challenge(challenge.id))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "challenge_responses",
          filter: `challenge_id=eq.${challenge.id}`,
        },
        (payload) => {
          const row = payload.new as ResponseRow
          setResponses((prev) =>
            prev.some((r) => r.id === row.id) ? prev : [...prev, { ...row, authorName: "Someone" }]
          )
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "challenges",
          filter: `id=eq.${challenge.id}`,
        },
        (payload) => setChallenge(payload.new as ChallengeRow)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [challenge.id])

  async function submitResponse() {
    setSubmitting(true)
    const result = await createChallengeResponse(eventSlug, challenge.event_id, challenge.id, {
      body,
      isIntroductionOffer: isIntro,
    })
    setSubmitting(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setBody("")
    setIsIntro(false)
  }

  async function solve(responseId: string) {
    const result = await markChallengeSolved(eventSlug, challenge.id, responseId)
    if (!result.success) toast.error(result.error)
    else toast.success("Marked as solved!")
  }

  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-xl font-bold">{challenge.title}</h1>
        <div className="flex shrink-0 items-center gap-1">
          {isAuthor && <Badge variant="secondary">Yours</Badge>}
          {challenge.status === "solved" && (
            <Badge className="gap-1 bg-primary/20 text-primary">
              <CheckCircle2 className="size-3" /> Solved
            </Badge>
          )}
        </div>
      </div>
      <p className="text-xs font-medium text-muted-foreground">by {authorName}</p>
      <p className="text-sm text-muted-foreground">{challenge.description}</p>

      <div className="flex flex-col gap-3">
        {responses.map((r) => (
          <GlassCard key={r.id} className="flex flex-col gap-2 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{r.authorName}</span>
              {r.is_introduction_offer && (
                <Badge variant="secondary" className="gap-1">
                  <HandHeart className="size-3" /> Offering an intro
                </Badge>
              )}
            </div>
            <p className="text-sm">{r.body}</p>
            {isAuthor && challenge.status !== "solved" && (
              <Button size="sm" variant="outline" className="w-fit" onClick={() => solve(r.id)}>
                Mark as solved
              </Button>
            )}
            {challenge.solved_by_response_id === r.id && (
              <span className="text-xs font-medium text-primary">✓ This solved it</span>
            )}
          </GlassCard>
        ))}
      </div>

      {challenge.status !== "solved" && (
        <GlassCard className="flex flex-col gap-3">
          <Textarea
            placeholder="Share advice, an intro, or a resource..."
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={isIntro} onCheckedChange={(v) => setIsIntro(Boolean(v))} />
            I can offer an introduction
          </label>
          <Button disabled={body.length < 2 || submitting} onClick={submitResponse}>
            {submitting ? "Posting..." : "Respond"}
          </Button>
        </GlassCard>
      )}
    </div>
  )
}
