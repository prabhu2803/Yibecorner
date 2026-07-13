"use client"

import * as React from "react"
import { PlusCircle } from "lucide-react"
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
        <Button className="glow-primary gap-2">
          <PlusCircle className="size-4" />
          Post a Challenge
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post a business challenge</DialogTitle>
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
        <DialogFooter>
          <Button disabled={title.length < 4 || description.length < 10 || submitting} onClick={submit}>
            {submitting ? "Posting..." : "Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
