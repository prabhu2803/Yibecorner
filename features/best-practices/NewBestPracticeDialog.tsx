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
import { createBestPractice } from "@/features/best-practices/actions"

export function NewBestPracticeDialog({ eventSlug, eventId }: { eventSlug: string; eventId: string }) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [body, setBody] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  async function submit() {
    setSubmitting(true)
    const result = await createBestPractice(eventSlug, eventId, { title, body })
    setSubmitting(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success("Best practice shared")
    setTitle("")
    setBody("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="glow-primary gap-2">
          <PlusCircle className="size-4" />
          Share a Best Practice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share an actionable lesson</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            placeholder="e.g. Always negotiate term sheets in writing"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="What did you learn, and how can others apply it?"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button disabled={title.length < 4 || body.length < 10 || submitting} onClick={submit}>
            {submitting ? "Sharing..." : "Share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
