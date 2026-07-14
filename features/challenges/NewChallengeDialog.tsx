"use client"

import * as React from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"
import { createChallenge } from "@/features/challenges/actions"

export function NewChallengeDialog({ eventSlug, eventId }: { eventSlug: string; eventId: string }) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  async function submit() {
    setSubmitting(true)
    const result = await createChallenge(eventSlug, eventId, { title, description })
    setSubmitting(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success("Challenge posted")
    setTitle("")
    setDescription("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="cc-neon-primary gap-2 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]">
          <MaterialIcon name="add_circle" className="text-[18px]" />
          Post a Challenge
        </Button>
      </DialogTrigger>
      <DialogContent className="cc-scope rounded-2xl border border-white/10 bg-[var(--cc-surface)] text-[var(--cc-on-surface)]">
        <DialogHeader>
          <DialogTitle className="cc-headline text-base font-bold text-[var(--cc-on-surface)]">
            Post a business challenge
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            placeholder="e.g. Struggling to close enterprise deals"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Add context — what have you tried, what kind of help are you looking for?"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <DialogFooter className="rounded-b-2xl border-t border-white/10 bg-transparent">
          <Button
            className="cc-neon-primary rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
            disabled={title.length < 4 || description.length < 10 || submitting}
            onClick={submit}
          >
            {submitting ? "Posting..." : "Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
