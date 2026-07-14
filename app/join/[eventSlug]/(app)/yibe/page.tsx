import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { AppTopBar } from "@/components/shared/AppTopBar"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"
import { getEventBySlug } from "@/lib/queries/events"
import { createClient } from "@/lib/supabase/server"

export default async function YibeCornerPage({
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

  const tiles = [
    {
      href: `/join/${eventSlug}/yibe/challenges`,
      icon: "forum",
      label: "Business Challenges",
      desc: "Ask for help, offer introductions, mark problems solved.",
    },
    {
      href: `/join/${eventSlug}/yibe/best-practices`,
      icon: "lightbulb",
      label: "Best Practices",
      desc: "Share and save actionable lessons from other founders.",
    },
    {
      href: `/join/${eventSlug}/yibe/discussions`,
      icon: "groups",
      label: "Industry Discussions",
      desc: "Join a conversation — popular ones become in-person circles.",
    },
  ]

  return (
    <div className="-mx-4 flex flex-1 flex-col bg-[var(--cc-surface)]">
      <AppTopBar homeHref={`/join/${eventSlug}/home`} profileHref={`/join/${eventSlug}/profile`} initial={initial} />

      <div className="flex flex-col gap-4 px-4 py-6">
        <div>
          <h1 className="cc-headline text-xl font-bold text-[var(--cc-on-surface)]">YIBE Corner</h1>
          <p className="text-sm text-[var(--cc-on-surface-variant)]">Where entrepreneurs help entrepreneurs.</p>
        </div>
        {tiles.map(({ href, icon, label, desc }) => (
          <Link key={href} href={href}>
            <div className="cc-glass-panel flex items-center gap-4 rounded-2xl p-4 transition hover:border-[var(--cc-primary)]/40">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[rgba(221,183,255,0.1)] text-[var(--cc-primary)]">
                <MaterialIcon name={icon} className="text-[24px]" />
              </div>
              <div>
                <p className="cc-headline font-semibold text-[var(--cc-on-surface)]">{label}</p>
                <p className="text-xs text-[var(--cc-on-surface-variant)]">{desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
