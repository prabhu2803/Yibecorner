import Link from "next/link"
import { notFound } from "next/navigation"
import { Bookmark, ThumbsUp } from "lucide-react"

import { GlassCard } from "@/components/shared/GlassCard"
import { NewBestPracticeDialog } from "@/features/best-practices/NewBestPracticeDialog"
import { getEventBySlug } from "@/lib/queries/events"
import { createClient } from "@/lib/supabase/server"

export default async function BestPracticesPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params
  const result = await getEventBySlug(eventSlug)
  if (!result) notFound()

  const supabase = await createClient()
  const { data: practices } = await supabase
    .from("best_practices")
    .select("*")
    .eq("event_id", result.event.id)
    .order("upvote_count", { ascending: false })

  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Best Practices</h1>
          <p className="text-sm text-muted-foreground">Actionable lessons from other founders.</p>
        </div>
        <NewBestPracticeDialog eventSlug={eventSlug} eventId={result.event.id} />
      </div>

      {practices?.map((p) => (
        <Link key={p.id} href={`/join/${eventSlug}/yibe/best-practices/${p.id}`}>
          <GlassCard className="flex flex-col gap-2 transition hover:bg-white/10">
            <p className="font-semibold">{p.title}</p>
            <p className="line-clamp-2 text-sm text-muted-foreground">{p.body}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ThumbsUp className="size-3" /> {p.upvote_count}
              </span>
              <span className="flex items-center gap-1">
                <Bookmark className="size-3" /> {p.save_count}
              </span>
            </div>
          </GlassCard>
        </Link>
      ))}

      {!practices?.length && (
        <p className="text-sm text-muted-foreground">No best practices shared yet.</p>
      )}
    </div>
  )
}
