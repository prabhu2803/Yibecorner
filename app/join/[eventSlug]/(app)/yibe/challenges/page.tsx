import Link from "next/link"
import { notFound } from "next/navigation"
import { CheckCircle2, MessageCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/shared/GlassCard"
import { NewChallengeDialog } from "@/features/challenges/NewChallengeDialog"
import { getEventBySlug } from "@/lib/queries/events"
import { createClient } from "@/lib/supabase/server"

export default async function ChallengesPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params
  const result = await getEventBySlug(eventSlug)
  if (!result) notFound()

  const supabase = await createClient()
  const { data: challenges } = await supabase
    .from("challenges")
    .select("*, challenge_responses(count)")
    .eq("event_id", result.event.id)
    .order("created_at", { ascending: false })

  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Business Challenges</h1>
          <p className="text-sm text-muted-foreground">Ask for help, offer introductions.</p>
        </div>
        <NewChallengeDialog eventSlug={eventSlug} eventId={result.event.id} />
      </div>

      {challenges?.map((challenge) => (
        <Link key={challenge.id} href={`/join/${eventSlug}/yibe/challenges/${challenge.id}`}>
          <GlassCard className="flex flex-col gap-2 transition hover:bg-white/10">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{challenge.title}</p>
              {challenge.status === "solved" && (
                <Badge className="gap-1 bg-primary/20 text-primary">
                  <CheckCircle2 className="size-3" /> Solved
                </Badge>
              )}
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">{challenge.description}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageCircle className="size-3" />
              {challenge.challenge_responses?.[0]?.count ?? 0} responses
            </div>
          </GlassCard>
        </Link>
      ))}

      {!challenges?.length && (
        <p className="text-sm text-muted-foreground">No challenges posted yet — be the first!</p>
      )}
    </div>
  )
}
