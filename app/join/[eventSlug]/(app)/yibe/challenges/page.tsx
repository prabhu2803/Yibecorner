import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { AppTopBar } from "@/components/shared/AppTopBar"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/join/${eventSlug}`)

  const { data: me } = await supabase
    .from("event_participants")
    .select("id, full_name")
    .eq("event_id", result.event.id)
    .eq("user_id", user.id)
    .maybeSingle()
  const initial = (me?.full_name?.trim()[0] ?? "?").toUpperCase()

  const { data: challenges } = await supabase
    .from("challenges")
    .select("*, challenge_responses(count)")
    .eq("event_id", result.event.id)
    .order("created_at", { ascending: false })

  const authorIds = Array.from(new Set((challenges ?? []).map((c) => c.author_id)))
  const { data: authors } = authorIds.length
    ? await supabase.from("event_participants").select("id, full_name").in("id", authorIds)
    : { data: [] }
  const authorNameById = new Map((authors ?? []).map((a) => [a.id, a.full_name]))

  return (
    <div className="-mx-4 flex flex-1 flex-col bg-[var(--cc-surface)]">
      <AppTopBar homeHref={`/join/${eventSlug}/home`} profileHref={`/join/${eventSlug}/profile`} initial={initial} />

      <div className="flex flex-col gap-4 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="cc-headline text-xl font-bold text-[var(--cc-on-surface)]">Business Challenges</h1>
            <p className="text-sm text-[var(--cc-on-surface-variant)]">Ask for help, offer introductions.</p>
          </div>
          <NewChallengeDialog eventSlug={eventSlug} eventId={result.event.id} />
        </div>

        {challenges?.map((challenge) => (
          <Link key={challenge.id} href={`/join/${eventSlug}/yibe/challenges/${challenge.id}`}>
            <div className="cc-glass-panel flex flex-col gap-2 rounded-2xl p-4 transition hover:border-[var(--cc-primary)]/40">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-[var(--cc-on-surface)]">{challenge.title}</p>
                <div className="flex shrink-0 items-center gap-1">
                  {challenge.author_id === me?.id && (
                    <span className="cc-label-tech rounded-full bg-[rgba(221,183,255,0.12)] px-2 py-0.5 text-[10px] text-[var(--cc-primary)] uppercase">
                      Yours
                    </span>
                  )}
                  {challenge.status === "solved" && (
                    <span className="cc-neon-primary flex items-center gap-1 rounded-full bg-[rgba(221,183,255,0.12)] px-2 py-0.5">
                      <MaterialIcon name="check_circle" className="text-[12px] text-[var(--cc-primary)]" />
                      <span className="cc-label-tech text-[10px] text-[var(--cc-primary)] uppercase">Solved</span>
                    </span>
                  )}
                </div>
              </div>
              <p className="line-clamp-2 text-sm text-[var(--cc-on-surface-variant)]">{challenge.description}</p>
              <div className="flex items-center justify-between text-xs text-[var(--cc-on-surface-variant)]">
                <span>by {authorNameById.get(challenge.author_id) ?? "Someone"}</span>
                <div className="flex items-center gap-1">
                  <MaterialIcon name="forum" className="text-[14px]" />
                  {challenge.challenge_responses?.[0]?.count ?? 0} responses
                </div>
              </div>
            </div>
          </Link>
        ))}

        {!challenges?.length && (
          <p className="text-sm text-[var(--cc-on-surface-variant)]">No challenges posted yet — be the first!</p>
        )}
      </div>
    </div>
  )
}
