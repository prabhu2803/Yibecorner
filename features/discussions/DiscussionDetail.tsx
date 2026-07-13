"use client"

import * as React from "react"
import { MapPin, Users } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/shared/GlassCard"
import { toggleDiscussionMembership } from "@/features/discussions/actions"
import { realtimeChannels } from "@/lib/realtime/channels"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database.types"

type DiscussionRow = Database["public"]["Tables"]["discussions"]["Row"]

export function DiscussionDetail({
  eventSlug,
  discussion: initialDiscussion,
  memberNames,
  isMember: initialIsMember,
}: {
  eventSlug: string
  discussion: DiscussionRow
  memberNames: string[]
  isMember: boolean
}) {
  const [discussion, setDiscussion] = React.useState(initialDiscussion)
  const [isMember, setIsMember] = React.useState(initialIsMember)
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(realtimeChannels.discussion(discussion.id))
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "discussions",
          filter: `id=eq.${discussion.id}`,
        },
        (payload) => setDiscussion(payload.new as DiscussionRow)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [discussion.id])

  async function toggleMembership() {
    setPending(true)
    const next = !isMember
    const result = await toggleDiscussionMembership(eventSlug, discussion.event_id, discussion.id, next)
    setPending(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setIsMember(next)
    setDiscussion((d) => ({
      ...d,
      participant_count: Math.max(0, d.participant_count + (next ? 1 : -1)),
    }))
  }

  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-xl font-bold">{discussion.topic}</h1>
        {discussion.status === "converted" && (
          <Badge className="gap-1 bg-accent/20 text-accent">
            <MapPin className="size-3" /> Physical circle
          </Badge>
        )}
      </div>
      {discussion.description && <p className="text-sm text-muted-foreground">{discussion.description}</p>}

      {discussion.circle_location && (
        <GlassCard className="glow-amber flex items-center gap-2 text-sm">
          <MapPin className="size-4 text-accent" />
          Meet in person at <strong>{discussion.circle_location}</strong>
        </GlassCard>
      )}

      <Button onClick={toggleMembership} disabled={pending} variant={isMember ? "outline" : "default"}>
        {isMember ? "Leave discussion" : "Join discussion"}
      </Button>

      <GlassCard className="flex flex-col gap-2">
        <p className="flex items-center gap-1 text-sm font-semibold text-muted-foreground">
          <Users className="size-4" /> {discussion.participant_count} members
        </p>
        <div className="flex flex-wrap gap-2">
          {memberNames.map((name, i) => (
            <Badge key={i} variant="secondary">
              {name}
            </Badge>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
