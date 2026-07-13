import Link from "next/link"
import { MessageSquareText, Lightbulb, Users2 } from "lucide-react"

import { GlassCard } from "@/components/shared/GlassCard"

export default async function YibeCornerPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params

  const tiles = [
    {
      href: `/join/${eventSlug}/yibe/challenges`,
      icon: MessageSquareText,
      label: "Business Challenges",
      desc: "Ask for help, offer introductions, mark problems solved.",
    },
    {
      href: `/join/${eventSlug}/yibe/best-practices`,
      icon: Lightbulb,
      label: "Best Practices",
      desc: "Share and save actionable lessons from other founders.",
    },
    {
      href: `/join/${eventSlug}/yibe/discussions`,
      icon: Users2,
      label: "Industry Discussions",
      desc: "Join a conversation — popular ones become in-person circles.",
    },
  ]

  return (
    <div className="flex flex-col gap-4 py-6">
      <div>
        <h1 className="text-xl font-bold">YIBE Corner</h1>
        <p className="text-sm text-muted-foreground">
          Where entrepreneurs help entrepreneurs.
        </p>
      </div>
      {tiles.map(({ href, icon: Icon, label, desc }) => (
        <Link key={href} href={href}>
          <GlassCard className="flex items-center gap-4 transition hover:bg-white/10">
            <Icon className="size-8 shrink-0 text-accent" />
            <div>
              <p className="font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </GlassCard>
        </Link>
      ))}
    </div>
  )
}
