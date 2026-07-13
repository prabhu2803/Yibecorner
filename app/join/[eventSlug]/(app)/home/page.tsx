"use client"

import Link from "next/link"
import { Sparkles, Users, QrCode, UserRound, Trophy, Handshake } from "lucide-react"

import { GlassCard } from "@/components/shared/GlassCard"
import { VibiMascot } from "@/features/vibi/VibiMascot"
import { useParticipantSession } from "@/features/session/ParticipantSessionProvider"

const TILES = [
  { key: "matches", label: "AI Matchmaking", desc: "See who you should meet", icon: Sparkles },
  { key: "yibe", label: "YIBE Corner", desc: "Challenges, best practices, discussions", icon: Users },
  { key: "connections", label: "My Connections", desc: "Verified connections from this event", icon: Handshake },
  { key: "profile", label: "My Profile", desc: "Edit your details", icon: UserRound },
  { key: "profile/qr", label: "My QR", desc: "Let others scan you to connect", icon: QrCode },
] as const

export default function HomePage() {
  const { event, participant } = useParticipantSession()
  const firstName = participant?.full_name?.split(" ")[0] ?? "there"

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex items-center gap-4">
        <VibiMascot state="wave" size={72} />
        <div>
          <h1 className="text-xl font-bold">Hi {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground">Welcome to {event.name}</p>
        </div>
      </div>

      <GlassCard className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Contribution Score</p>
          <p className="text-3xl font-bold text-accent">{participant?.contribution_score ?? 0}</p>
        </div>
        <Trophy className="glow-amber size-10 rounded-full text-accent" />
      </GlassCard>

      <div className="grid grid-cols-2 gap-3">
        {TILES.map(({ key, label, desc, icon: Icon }) => (
          <Link key={key} href={`/join/${event.slug}/${key}`}>
            <GlassCard className="flex h-full flex-col gap-2 transition hover:bg-white/10">
              <Icon className="size-6 text-accent" />
              <span className="font-semibold">{label}</span>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  )
}
