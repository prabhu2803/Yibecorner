import { notFound, redirect } from "next/navigation"

import { AppTopBar } from "@/components/shared/AppTopBar"
import { BestPracticeList } from "@/features/best-practices/BestPracticeList"
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

  const { data: practices } = await supabase
    .from("best_practices")
    .select("*")
    .eq("event_id", result.event.id)
    .order("upvote_count", { ascending: false })

  const { data: saves } = me
    ? await supabase.from("best_practice_saves").select("best_practice_id").eq("participant_id", me.id)
    : { data: [] }
  const savedIds = (saves ?? []).map((s) => s.best_practice_id)

  return (
    <div className="-mx-4 flex flex-1 flex-col bg-[var(--cc-surface)]">
      <AppTopBar homeHref={`/join/${eventSlug}/home`} profileHref={`/join/${eventSlug}/profile`} initial={initial} />

      <div className="flex flex-col gap-4 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="cc-headline text-xl font-bold text-[var(--cc-on-surface)]">Best Practices</h1>
            <p className="text-sm text-[var(--cc-on-surface-variant)]">Actionable lessons from other founders.</p>
          </div>
          <NewBestPracticeDialog eventSlug={eventSlug} eventId={result.event.id} />
        </div>

        <BestPracticeList eventSlug={eventSlug} practices={practices ?? []} savedIds={savedIds} />
      </div>
    </div>
  )
}
