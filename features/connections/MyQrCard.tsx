"use client"

import { QRCodeSVG } from "qrcode.react"

import { AppTopBar } from "@/components/shared/AppTopBar"
import { QrFrame } from "@/components/shared/QrFrame"
import { VibiMascot } from "@/features/vibi/VibiMascot"

export function MyQrCard({
  scanUrl,
  manualCode,
  fullName,
  homeHref,
  profileHref,
  initial,
}: {
  scanUrl: string
  manualCode: string
  fullName: string
  homeHref: string
  profileHref: string
  initial: string
}) {
  return (
    <div className="-mx-4 flex flex-1 flex-col bg-[var(--cc-surface)]">
      <AppTopBar homeHref={homeHref} profileHref={profileHref} initial={initial} />

      <div className="flex flex-col items-center gap-4 px-4 py-6">
        <VibiMascot state="look_at_qr" size={96} />
        <h1 className="cc-headline text-xl font-bold text-[var(--cc-on-surface)]">{fullName}&apos;s QR</h1>
        <p className="text-center text-sm text-[var(--cc-on-surface-variant)]">
          Show this to someone at the event — they scan it to connect with you.
        </p>
        <QrFrame>
          <QRCodeSVG value={scanUrl} size={200} />
        </QrFrame>
        <div className="cc-glass-panel w-full rounded-2xl p-4 text-center">
          <p className="cc-label-tech text-[11px] tracking-widest text-[var(--cc-on-surface-variant)] uppercase">
            Bad lighting? Share this code instead
          </p>
          <p className="cc-headline mt-1 text-2xl font-bold tracking-widest text-[var(--cc-primary)]">
            {manualCode}
          </p>
        </div>
      </div>
    </div>
  )
}
