"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"
import type { Database } from "@/types/database.types"

type PracticeRow = Database["public"]["Tables"]["best_practices"]["Row"]

/**
 * toggleSave (features/best-practices/actions.ts) writes to
 * best_practice_saves, but nothing ever read that back as a list — this
 * is the "where do I see what I saved" view. Filters client-side since
 * the full list + saved-id set are already fetched server-side in one
 * pass, no second round trip needed.
 */
export function BestPracticeList({
  eventSlug,
  practices,
  savedIds,
}: {
  eventSlug: string
  practices: PracticeRow[]
  savedIds: string[]
}) {
  const [tab, setTab] = React.useState<"all" | "saved">("all")
  const savedSet = React.useMemo(() => new Set(savedIds), [savedIds])
  const visible = tab === "saved" ? practices.filter((p) => savedSet.has(p.id)) : practices

  return (
    <div className="flex flex-col gap-4">
      <div className="cc-glass-panel flex w-fit gap-1 rounded-full p-1">
        {(["all", "saved"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "cc-label-tech rounded-full px-4 py-1.5 text-[11px] tracking-widest uppercase transition",
              tab === key
                ? "cc-neon-primary bg-[var(--cc-primary)]/15 text-[var(--cc-primary)]"
                : "text-[var(--cc-on-surface-variant)]"
            )}
          >
            {key === "all" ? "All" : `Saved (${savedIds.length})`}
          </button>
        ))}
      </div>

      {visible.map((p) => (
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

      {visible.length === 0 && tab === "saved" && (
        <p className="text-sm text-[var(--cc-on-surface-variant)]">
          Nothing saved yet — tap the bookmark icon on a best practice to save it here.
        </p>
      )}
      {visible.length === 0 && tab === "all" && (
        <p className="text-sm text-[var(--cc-on-surface-variant)]">No best practices shared yet.</p>
      )}
    </div>
  )
}
