"use client"

import * as React from "react"
import { Bookmark, ThumbsUp } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { GlassCard } from "@/components/shared/GlassCard"
import { addComment, toggleSave, toggleUpvote } from "@/features/best-practices/actions"
import { realtimeChannels } from "@/lib/realtime/channels"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database.types"

type PracticeRow = Database["public"]["Tables"]["best_practices"]["Row"]
type CommentRow = Database["public"]["Tables"]["best_practice_comments"]["Row"]

export interface CommentView extends CommentRow {
  authorName: string
}

export function BestPracticeDetail({
  eventSlug,
  practice: initialPractice,
  comments: initialComments,
  initiallyUpvoted,
  initiallySaved,
}: {
  eventSlug: string
  practice: PracticeRow
  comments: CommentView[]
  initiallyUpvoted: boolean
  initiallySaved: boolean
}) {
  const [practice, setPractice] = React.useState(initialPractice)
  const [comments, setComments] = React.useState(initialComments)
  const [upvoted, setUpvoted] = React.useState(initiallyUpvoted)
  const [saved, setSaved] = React.useState(initiallySaved)
  const [commentBody, setCommentBody] = React.useState("")

  React.useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(realtimeChannels.bestPractice(practice.id))
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "best_practices",
          filter: `id=eq.${practice.id}`,
        },
        (payload) => setPractice(payload.new as PracticeRow)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [practice.id])

  async function handleUpvote() {
    setUpvoted((v) => !v)
    const result = await toggleUpvote(practice.id)
    if (!result.success) {
      toast.error(result.error)
      setUpvoted((v) => !v)
    }
  }

  async function handleSave() {
    setSaved((v) => !v)
    const result = await toggleSave(practice.id)
    if (!result.success) {
      toast.error(result.error)
      setSaved((v) => !v)
    }
  }

  async function submitComment() {
    const result = await addComment(eventSlug, practice.id, commentBody)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setComments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        best_practice_id: practice.id,
        author_id: "",
        body: commentBody,
        created_at: new Date().toISOString(),
        authorName: "You",
      },
    ])
    setCommentBody("")
  }

  return (
    <div className="flex flex-col gap-4 py-6">
      <h1 className="text-xl font-bold">{practice.title}</h1>
      <p className="text-sm text-muted-foreground whitespace-pre-line">{practice.body}</p>

      <div className="flex gap-2">
        <Button variant={upvoted ? "default" : "outline"} className="gap-2" onClick={handleUpvote}>
          <ThumbsUp className="size-4" /> {practice.upvote_count}
        </Button>
        <Button variant={saved ? "default" : "outline"} className="gap-2" onClick={handleSave}>
          <Bookmark className="size-4" /> {saved ? "Saved" : "Save"}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Comments</h2>
        {comments.map((c) => (
          <GlassCard key={c.id} className="py-3">
            <p className="text-sm font-semibold">{c.authorName}</p>
            <p className="text-sm">{c.body}</p>
          </GlassCard>
        ))}
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a comment..."
            rows={2}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
          />
          <Button disabled={commentBody.length < 1} onClick={submitComment}>
            Post
          </Button>
        </div>
      </div>
    </div>
  )
}
