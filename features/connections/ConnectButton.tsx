"use client"

import * as React from "react"
import { Check, Clock, Plus } from "lucide-react"
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
import { sendConnectionRequest } from "@/features/connections/actions"

export type ConnectionStatus = "pending" | "accepted" | "declined" | "expired" | null

/**
 * Compact connect affordance for contexts where a full MatchCard would be
 * too heavy — e.g. next to a name in a discussion's member roster or
 * message feed. Same request flow as MatchCard's Connect button
 * (sendConnectionRequest, requires recipient accept/decline), just a
 * "+" icon instead of a full card.
 *
 * Status is controlled by the parent rather than owned locally: the same
 * person can appear twice on one page (once in the member roster, once as
 * a message author), and if each instance tracked its own status,
 * sending a request from one wouldn't update the other until reload.
 */
export function ConnectButton({
  eventSlug,
  eventId,
  participantId,
  name,
  status,
  onSent,
}: {
  eventSlug: string
  eventId: string
  participantId: string
  name: string
  status: ConnectionStatus
  onSent: (participantId: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const [sending, setSending] = React.useState(false)

  if (status === "accepted") {
    return (
      <span
        title="Connected"
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
      >
        <Check className="size-3.5" />
      </span>
    )
  }

  if (status === "pending") {
    return (
      <span
        title="Request sent"
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <Clock className="size-3.5" />
      </span>
    )
  }

  async function handleSend() {
    setSending(true)
    const result = await sendConnectionRequest(eventSlug, eventId, {
      recipientParticipantId: participantId,
      message,
      initiatedVia: "match",
    })
    setSending(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    onSent(participantId)
    setOpen(false)
    setMessage("")
    toast.success(`Request sent to ${name}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title={`Connect with ${name}`}
          className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary transition hover:bg-primary/10"
        >
          <Plus className="size-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect with {name}?</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="Optional message, e.g. I'd love to chat about this..."
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={sending} onClick={handleSend}>
            {sending ? "Sending..." : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
