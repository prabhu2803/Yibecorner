import Link from "next/link"

import { MaterialIcon } from "@/features/onboarding/MaterialIcon"

/**
 * Persistent header for every top-level destination in the post-onboarding
 * app (Home, Matches, YIBE Corner, Connections, My QR) — grid icon + Vibe
 * Corner wordmark, with a small initial-avatar linking to the profile.
 * Distinct from OnboardingTopBar (features/onboarding/OnboardingForm.tsx),
 * which shows a dismiss glyph instead since it's a linear step flow, not a
 * destination you navigate back to via the bottom nav.
 */
export function AppTopBar({
  homeHref,
  profileHref,
  initial,
}: {
  homeHref: string
  profileHref: string
  initial: string
}) {
  return (
    <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[var(--cc-surface)]/85 px-4 backdrop-blur-xl">
      <Link href={homeHref} className="flex items-center gap-2">
        <MaterialIcon name="grid_view" className="text-[20px] text-[var(--cc-primary)]" />
        <span className="cc-headline text-sm font-bold tracking-tight text-[var(--cc-primary)]">VIBE CORNER</span>
      </Link>
      <Link
        href={profileHref}
        className="flex size-8 items-center justify-center rounded-full border border-[var(--cc-primary)]/30 bg-[rgba(221,183,255,0.1)] text-xs font-bold text-[var(--cc-primary)]"
      >
        {initial}
      </Link>
    </div>
  )
}
