import Link from "next/link"
import { notFound } from "next/navigation"
import { MapPin, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/shared/GlassCard"
import { NewDiscussionDialog } from "@/features/discussions/NewDiscussionDialog"
import { getEventBySlug } from "@/lib/queries/events"
import { createClient } from "@/lib/supabase/server"

export default async function DiscussionsPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params
  const result = await getEventBySlug(eventSlug)
  if (!result) notFound()

  const supabase = await createClient()
  const { data: discussions } = await supabase
    .from("discussions")
    .select("*")
    .eq("event_id", result.event.id)
    .order("participant_count", { ascending: false })

  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Industry Discussions</h1>
          <p className="text-sm text-muted-foreground">Browse and join a conversation.</p>
        </div>
        <NewDiscussionDialog eventSlug={eventSlug} eventId={result.event.id} />
      </div>

      {discussions?.map((d) => (
        <Link key={d.id} href={`/join/${eventSlug}/yibe/discussions/${d.id}`}>
          <GlassCard className="flex flex-col gap-2 transition hover:bg-white/10">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{d.topic}</p>
              {d.status === "converted" && (
                <Badge className="gap-1 bg-accent/20 text-accent">
                  <MapPin className="size-3" /> Circle
                </Badge>
              )}
            </div>
            {d.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{d.description}</p>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3" /> {d.participant_count} joined
              {d.circle_location && <span> · Meet at {d.circle_location}</span>}
            </div>
          </GlassCard>
        </Link>
      ))}

      {!discussions?.length && (
        <p className="text-sm text-muted-foreground">No discussions yet — start one!</p>
      )}
    </div>
  )
}
