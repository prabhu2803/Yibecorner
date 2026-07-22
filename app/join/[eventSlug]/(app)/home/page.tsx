"use client"

import * as React from "react"
import Link from "next/link"

import { AppTopBar } from "@/components/shared/AppTopBar"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"
import { VibiMascot } from "@/features/vibi/VibiMascot"
import { useParticipantSession } from "@/features/session/ParticipantSessionProvider"
import { createClient } from "@/lib/supabase/client"
import type { ChallengeStatus } from "@/types/database.types"

interface MyChallenge {
  id: string
  title: string
  status: ChallengeStatus
  responseCount: number
}

const TILES = [
  { key: "matches", label: "AI Matchmaking", desc: "See who you should meet", icon: "auto_awesome" },
  { key: "yibe", label: "YIBE Corner", desc: "Challenges, best practices, discussions", icon: "groups" },
  { key: "connections", label: "My Connections", desc: "Verified connections from this event", icon: "handshake" },
  { key: "profile", label: "My Profile", desc: "Edit your details", icon: "person" },
  { key: "profile/qr", label: "My QR", desc: "Let others scan you to connect", icon: "qr_code_2" },
] as const

export default function HomePage() {
  const { event, participant } = useParticipantSession()
  const firstName = participant?.full_name?.split(" ")[0] ?? "there"
  const initial = (participant?.full_name?.trim()[0] ?? "?").toUpperCase()
  const [myChallenge, setMyChallenge] = React.useState<MyChallenge | null>(null)

  React.useEffect(() => {
    if (!participant) return
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("challenges")
        .select("id, title, status, challenge_responses!challenge_responses_challenge_id_fkey(count)")
        .eq("author_id", participant.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancelled) {
        setMyChallenge(
          data
            ? {
                id: data.id,
                title: data.title,
                status: data.status,
                responseCount: data.challenge_responses?.[0]?.count ?? 0,
              }
            : null
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [participant])

  return (
    <div className="-mx-4 flex flex-1 flex-col bg-[var(--cc-surface)]">
      <AppTopBar homeHref={`/join/${event.slug}/home`} profileHref={`/join/${event.slug}/profile`} initial={initial} />

      <div className="flex flex-col gap-6 px-4 py-6">
        <div className="flex items-center gap-4">
          <VibiMascot state="wave" size={72} />
          <div>
            <h1 className="cc-headline text-xl font-bold text-[var(--cc-on-surface)]">Hi {firstName}</h1>
            <p className="text-sm text-[var(--cc-on-surface-variant)]">Welcome to {event.name}</p>
          </div>
        </div>

        <div className="cc-glass-panel cc-neon-primary flex items-center justify-between rounded-2xl p-6">
          <div>
            <p className="cc-label-tech text-[11px] tracking-widest text-[var(--cc-on-surface-variant)] uppercase">
              Contribution Score
            </p>
            <p className="cc-headline mt-1 text-3xl font-bold text-[var(--cc-primary)]">
              {participant?.contribution_score ?? 0}
            </p>
          </div>
          <div className="flex size-14 items-center justify-center rounded-full bg-[rgba(221,183,255,0.1)] text-[var(--cc-primary)]">
            <MaterialIcon name="emoji_events" className="text-[28px]" />
          </div>
        </div>

        {myChallenge && (
          <Link href={`/join/${event.slug}/yibe/challenges/${myChallenge.id}`}>
            <div className="cc-glass-panel flex items-center gap-3 rounded-2xl p-4 transition hover:border-[var(--cc-primary)]/40">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[rgba(221,183,255,0.1)] text-[var(--cc-primary)]">
                <MaterialIcon name="forum" className="text-[20px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="cc-label-tech text-[10px] tracking-widest text-[var(--cc-on-surface-variant)] uppercase">
                  Your Challenge
                </p>
                <p className="truncate text-sm font-semibold text-[var(--cc-on-surface)]">{myChallenge.title}</p>
                <p className="text-xs text-[var(--cc-on-surface-variant)]">
                  {myChallenge.status === "solved" ? "Solved" : `${myChallenge.responseCount} responses`}
                </p>
              </div>
              <MaterialIcon name="chevron_right" className="shrink-0 text-[18px] text-[var(--cc-on-surface-variant)]" />
            </div>
          </Link>
        )}

        <div className="flex flex-col gap-3">
          {TILES.map(({ key, label, desc, icon }) => (
            <Link key={key} href={`/join/${event.slug}/${key}`}>
              <div className="cc-glass-panel flex items-center gap-3 rounded-2xl p-3 transition hover:border-[var(--cc-primary)]/40">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[rgba(221,183,255,0.1)] text-[var(--cc-primary)]">
                  <MaterialIcon name={icon} className="text-[20px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="cc-headline text-sm font-semibold text-[var(--cc-on-surface)]">{label}</p>
                  <p className="truncate text-xs text-[var(--cc-on-surface-variant)]">{desc}</p>
                </div>
                <MaterialIcon name="chevron_right" className="shrink-0 text-[18px] text-[var(--cc-on-surface-variant)]" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
