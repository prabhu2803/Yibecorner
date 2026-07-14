import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { AppTopBar } from "@/components/shared/AppTopBar"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"
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
    .select("full_name")
    .eq("event_id", result.event.id)
    .eq("user_id", user.id)
    .maybeSingle()
  const initial = (me?.full_name?.trim()[0] ?? "?").toUpperCase()

  const { data: practices } = await supabase
    .from("best_practices")
    .select("*")
    .eq("event_id", result.event.id)
    .order("upvote_count", { ascending: false })

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

        {practices?.map((p) => (
          <Link key={p.id} href={`/join/${eventSlug}/yibe/best-practices/${p.id}`}>
            <div className="cc-glass-panel flex flex-col gap-2 rounded-2xl p-4 transition hover:border-[var(--cc-primary)]/40">
              <p className="font-semibold text-[var(--cc-on-surface)]">{p.title}</p>
              <p className="line-clamp-2 text-sm text-[var(--cc-on-surface-variant)]">{p.body}</p>
              <div className="flex items-center gap-4 text-xs text-[var(--cc-on-surface-variant)]">
                <span className="flex items-center gap-1">
                  <MaterialIcon name="thumb_up" className="text-[14px]" /> {p.upvote_count}
                </span>
                <span className="flex items-center gap-1">
                  <MaterialIcon name="bookmark" className="text-[14px]" /> {p.save_count}
                </span>
              </div>
            </div>
          </Link>
        ))}

        {!practices?.length && (
          <p className="text-sm text-[var(--cc-on-surface-variant)]">No best practices shared yet.</p>
        )}
      </div>
    </div>
  )
}
