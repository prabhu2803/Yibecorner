"use client"

import { AnimatePresence, motion } from "framer-motion"
import { QRCodeSVG } from "qrcode.react"
import { CheckCircle2, MessageSquareText, Lightbulb, Sparkles, Users, HeartHandshake } from "lucide-react"

import { LiveCounter } from "@/components/shared/LiveCounter"
import { QrFrame } from "@/components/shared/QrFrame"
import { VibiMascot } from "@/features/vibi/VibiMascot"
import { useVibiState } from "@/features/vibi/useVibiState"
import type { Announcement } from "@/hooks/use-screen-commands"
import type { Database } from "@/types/database.types"

type EventStats = Database["public"]["Tables"]["event_stats"]["Row"]
type EventRow = Database["public"]["Tables"]["events"]["Row"]

export function LiveLanding({
  event,
  stats,
  showQr,
  showParticipantNames,
  emergencyStaticMode,
  announcement,
  joinUrl,
}: {
  event: EventRow
  stats: EventStats | null
  showQr: boolean
  showParticipantNames: boolean
  emergencyStaticMode: boolean
  announcement: Announcement | null
  joinUrl: string
}) {
  const vibiState = useVibiState((s) => s.state)

  if (emergencyStaticMode) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <h1 className="text-4xl font-bold">{event.name}</h1>
        <p className="text-lg text-muted-foreground">
          Scan the code below to join Vibe Corner.
        </p>
        {showQr && (
          <div className="rounded-2xl bg-white p-4">
            <QRCodeSVG value={joinUrl} size={220} />
          </div>
        )}
      </div>
    )
  }

  const counters = [
    { label: "Entrepreneurs Joined", value: stats?.entrepreneurs_joined ?? 0, icon: <Users className="mx-auto size-4" /> },
    { label: "Verified Connections", value: stats?.verified_connections ?? 0, icon: <HeartHandshake className="mx-auto size-4" /> },
    { label: "Challenges Posted", value: stats?.challenges_posted ?? 0, icon: <MessageSquareText className="mx-auto size-4" /> },
    { label: "Problems Solved", value: stats?.problems_solved ?? 0, icon: <CheckCircle2 className="mx-auto size-4" /> },
    { label: "Best Practices Shared", value: stats?.best_practices_shared ?? 0, icon: <Lightbulb className="mx-auto size-4" /> },
    { label: "Discussions Active", value: stats?.discussions_active ?? 0, icon: <Sparkles className="mx-auto size-4" /> },
  ]

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center gap-16 overflow-hidden bg-background px-8 py-12">
      {/* A single soft glow behind the mascot — the only background treatment.
          No particles/aurora competing with it; the page should feel quiet. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="glow-primary h-[34rem] w-[34rem] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <AnimatePresence>
        {announcement && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="glass-card glow-primary absolute top-8 z-10 flex items-center gap-3 px-6 py-3"
          >
            <Sparkles className="text-accent" />
            <span className="text-lg font-medium">{announcement.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex flex-col items-center gap-6">
        <VibiMascot state={vibiState} size={288} />
        <div className="text-center">
          <h1 className="text-gradient-vibe text-4xl font-bold tracking-tight sm:text-5xl">
            VIBE CORNER
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{event.name}</p>
        </div>
      </div>

      {showQr && (
        <div className="relative flex flex-col items-center gap-3">
          <QrFrame>
            <QRCodeSVG value={joinUrl} size={168} />
          </QrFrame>
          <p className="text-lg font-semibold">Scan to Begin</p>
        </div>
      )}

      <div className="relative flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
        {counters.map((counter) => (
          <LiveCounter key={counter.label} variant="plain" {...counter} />
        ))}
      </div>

      {!showParticipantNames && (
        <span className="absolute right-6 bottom-6 text-xs text-muted-foreground/60">
          Names hidden
        </span>
      )}
    </div>
  )
}
