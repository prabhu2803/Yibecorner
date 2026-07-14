"use client"

import * as React from "react"
import { MapPin, Users } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { GlassCard } from "@/components/shared/GlassCard"
import { ConnectButton, type ConnectionStatus } from "@/features/connections/ConnectButton"
import { postDiscussionMessage, toggleDiscussionMembership } from "@/features/discussions/actions"
import { realtimeChannels } from "@/lib/realtime/channels"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database.types"

type DiscussionRow = Database["public"]["Tables"]["discussions"]["Row"]
type MessageRow = Database["public"]["Tables"]["discussion_messages"]["Row"]

export interface MessageView extends MessageRow {
  authorName: string
  connectionStatus: ConnectionStatus
}

export interface MemberView {
  id: string
  name: string
  connectionStatus: ConnectionStatus
}

export function DiscussionDetail({
  eventSlug,
  eventId,
  meId,
  discussion: initialDiscussion,
  members,
  isMember: initialIsMember,
  messages: initialMessages,
}: {
  eventSlug: string
  eventId: string
  meId: string | null
  discussion: DiscussionRow
  members: MemberView[]
  isMember: boolean
  messages: MessageView[]
}) {
  const [discussion, setDiscussion] = React.useState(initialDiscussion)
  const [isMember, setIsMember] = React.useState(initialIsMember)
  const [pending, setPending] = React.useState(false)
  const [messages, setMessages] = React.useState(initialMessages)
  const [body, setBody] = React.useState("")
  const [posting, setPosting] = React.useState(false)

  // Shared by participant id rather than owned per-button: the same
  // person can show up both in the member roster and as a message
  // author, and sending a request from one instance should update both.
  const [connectionStatusById, setConnectionStatusById] = React.useState<Map<string, ConnectionStatus>>(
    () =>
      new Map([
        ...members.map((m) => [m.id, m.connectionStatus] as const),
        ...initialMessages.map((m) => [m.author_id, m.connectionStatus] as const),
      ])
  )
  function markSent(participantId: string) {
    setConnectionStatusById((prev) => new Map(prev).set(participantId, "pending"))
  }

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
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "discussion_messages",
          filter: `discussion_id=eq.${discussion.id}`,
        },
        (payload) => {
          const row = payload.new as MessageRow
          setMessages((prev) =>
            prev.some((m) => m.id === row.id)
              ? prev
              : [...prev, { ...row, authorName: "Someone", connectionStatus: null }]
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [discussion.id])

  async function submitMessage() {
    setPosting(true)
    const result = await postDiscussionMessage(eventSlug, discussion.event_id, discussion.id, { body })
    setPosting(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setBody("")
  }

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
          {members.map((member) => (
            <Badge key={member.id} variant="secondary" className="flex items-center gap-1.5 py-1 pr-1">
              {member.name}
              {member.id !== meId && (
                <ConnectButton
                  eventSlug={eventSlug}
                  eventId={eventId}
                  participantId={member.id}
                  name={member.name}
                  status={connectionStatusById.get(member.id) ?? null}
                  onSent={markSent}
                />
              )}
            </Badge>
          ))}
        </div>
      </GlassCard>

      <div className="flex flex-col gap-3">
        {messages.map((m) => (
          <GlassCard key={m.id} className="flex flex-col gap-1 py-3">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold">{m.authorName}</span>
              {m.author_id !== meId && (
                <ConnectButton
                  eventSlug={eventSlug}
                  eventId={eventId}
                  participantId={m.author_id}
                  name={m.authorName}
                  status={connectionStatusById.get(m.author_id) ?? null}
                  onSent={markSent}
                />
              )}
            </div>
            <p className="text-sm">{m.body}</p>
          </GlassCard>
        ))}
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No messages yet — {isMember ? "start the conversation." : "join to say something."}
          </p>
        )}
      </div>

      {isMember ? (
        <GlassCard className="flex flex-col gap-3">
          <Textarea
            placeholder="Say something to the group..."
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button disabled={body.trim().length < 1 || posting} onClick={submitMessage}>
            {posting ? "Posting..." : "Post"}
          </Button>
        </GlassCard>
      ) : (
        <p className="text-center text-sm text-muted-foreground">Join this discussion to post a message.</p>
      )}
    </div>
  )
}
