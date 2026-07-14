"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
import { Input } from "@/components/ui/input"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"
import { createDiscussion } from "@/features/discussions/actions"

export function NewDiscussionDialog({ eventSlug, eventId }: { eventSlug: string; eventId: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [topic, setTopic] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  async function submit() {
    setSubmitting(true)
    const result = await createDiscussion(eventSlug, eventId, { topic })
    setSubmitting(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setTopic("")
    setOpen(false)
    router.push(`/join/${eventSlug}/yibe/discussions/${result.discussionId}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="cc-neon-primary gap-2 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]">
          <MaterialIcon name="add_circle" className="text-[18px]" />
          Start a Discussion
        </Button>
      </DialogTrigger>
      <DialogContent className="cc-scope rounded-2xl border border-white/10 bg-[var(--cc-surface)] text-[var(--cc-on-surface)]">
        <DialogHeader>
          <DialogTitle className="cc-headline text-base font-bold text-[var(--cc-on-surface)]">
            Start an industry discussion
          </DialogTitle>
        </DialogHeader>
        <Input
          placeholder="e.g. D2C go-to-market strategies"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <DialogFooter className="rounded-b-2xl border-t border-white/10 bg-transparent">
          <Button
            className="cc-neon-primary rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
            disabled={topic.length < 4 || submitting}
            onClick={submit}
          >
            {submitting ? "Starting..." : "Start"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
