import Image from "next/image"
import Link from "next/link"

import { GlowOrbs } from "@/components/shared/GlowOrbs"
import { HeroVideoPanel } from "@/components/landing/HeroVideoPanel"
import { TextRepel } from "@/components/ui/text-repel"
import { VibiMascot } from "@/features/vibi/VibiMascot"
import { clientEnv } from "@/lib/env"
import { getBaseUrl } from "@/lib/get-base-url"
import { getEventBySlug } from "@/lib/queries/events"
import { hankenGrotesk, jetbrainsMono, orbitron, spaceGrotesk } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { QRCodeSVG } from "qrcode.react"

export default async function HomePage() {
  const slug = clientEnv.NEXT_PUBLIC_DEFAULT_EVENT_SLUG
  const result = await getEventBySlug(slug)
  const baseUrl = await getBaseUrl()
  const joinUrl = `${baseUrl}/join/${slug}`

  const stats = result?.stats

  const counters = [
    { label: "Entrepreneurs Joined", value: stats?.entrepreneurs_joined ?? 0 },
    { label: "Verified Connections", value: stats?.verified_connections ?? 0 },
    { label: "Challenges Posted", value: stats?.challenges_posted ?? 0 },
    { label: "Best Practices Shared", value: stats?.best_practices_shared ?? 0 },
  ]

  return (
    <main
      className={cn(
        spaceGrotesk.variable,
        hankenGrotesk.variable,
        jetbrainsMono.variable,
        orbitron.variable,
        "font-[family-name:var(--font-hanken-grotesk)] relative flex h-screen w-full flex-col overflow-y-auto grid-bg-vibe"
      )}
    >
      <GlowOrbs />

      <div className="z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 p-4 sm:p-6">
        {/* Hero row — title block left, stats right, no mascot. */}
        <div className="flex shrink-0 flex-col items-start justify-between gap-4 px-2 py-4 sm:flex-row sm:items-center">
          <div className="max-w-xl space-y-1">
            <h1 className="font-[family-name:var(--font-orbitron)] text-6xl font-black tracking-tight uppercase sm:text-7xl">
              <TextRepel text="Yibe Corner" letterClassName="text-foreground" radius={140} strength={35} />
            </h1>
            <p className="font-[family-name:var(--font-space-grotesk)] text-base font-medium text-foreground/80 sm:text-lg">
              Turning event attendance into <span className="text-primary">real connections</span>
            </p>
            <p className="max-w-lg text-xs text-muted-foreground">
              Meet the right people. Solve real business challenges. Build meaningful partnerships.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-6">
            {counters.map((counter, i) => (
              <div key={counter.label} className="flex items-center gap-6">
                {i > 0 && <div className="h-9 w-px bg-white/15" />}
                <div className="text-center">
                  <div className="font-[family-name:var(--font-space-grotesk)] text-2xl leading-none text-primary">
                    {counter.value.toLocaleString()}
                  </div>
                  <div className="font-[family-name:var(--font-jetbrains-mono)] mt-1 text-[10px] tracking-widest text-muted-foreground uppercase">
                    {counter.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Video + QR */}
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          <div className="lg:col-span-9">
            <HeroVideoPanel />
          </div>

          <div className="flex flex-col items-center gap-4 text-center lg:col-span-3">
            <div className="flex items-center gap-2">
              <VibiMascot state="look_at_qr" size={64} />
              <h2 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-cyan">
                Join Yibe Corner
              </h2>
            </div>
            <p className="mx-auto max-w-[220px] text-xs text-muted-foreground">
              Scan to onboard on your phone and start networking instantly.
            </p>

            {/* On a phone you can't scan your own screen — the QR image
                itself is a tap target straight to /join/[slug] too, not
                just decorative, so mobile visitors have something to tap. */}
            <Link href={`/join/${slug}`} className="rounded-2xl bg-white p-5 transition active:scale-95">
              <QRCodeSVG value={joinUrl} size={220} />
            </Link>

            <Link
              href={`/join/${slug}`}
              className="font-[family-name:var(--font-jetbrains-mono)] rounded-full border border-cyan/40 px-4 py-2 text-xs tracking-widest text-cyan uppercase transition hover:bg-cyan/10 active:scale-95"
            >
              Tap to Get Started
            </Link>
          </div>
        </div>
      </div>

      <footer className="z-10 flex justify-center py-4">
        <a
          href="https://www.strawlabs.in"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 transition hover:opacity-80 active:scale-95"
        >
          <span className="font-[family-name:var(--font-jetbrains-mono)] text-base tracking-widest text-muted-foreground uppercase sm:text-lg">
            Powered by
          </span>
          <Image src="/logos/strawlabs.png" alt="STRAW Labs" width={280} height={94} className="h-16 w-auto rounded sm:h-20" />
        </a>
      </footer>
    </main>
  )
}
