"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
        <Button className="glow-primary gap-2">
          <PlusCircle className="size-4" />
          Start a Discussion
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start an industry discussion</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="e.g. D2C go-to-market strategies"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <DialogFooter>
          <Button disabled={topic.length < 4 || submitting} onClick={submit}>
            {submitting ? "Starting..." : "Start"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
