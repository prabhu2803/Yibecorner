"use client"

import { QRCodeSVG } from "qrcode.react"

import { GlassCard } from "@/components/shared/GlassCard"
import { QrFrame } from "@/components/shared/QrFrame"
import { VibiMascot } from "@/features/vibi/VibiMascot"

export function MyQrCard({
  scanUrl,
  manualCode,
  fullName,
}: {
  scanUrl: string
  manualCode: string
  fullName: string
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <VibiMascot state="look_at_qr" size={96} />
      <h1 className="text-xl font-bold">{fullName}&apos;s QR</h1>
      <p className="text-center text-sm text-muted-foreground">
        Show this to someone at the event — they scan it to connect with you.
      </p>
      <QrFrame>
        <QRCodeSVG value={scanUrl} size={200} />
      </QrFrame>
      <GlassCard className="w-full text-center">
        <p className="text-xs text-muted-foreground">Bad lighting? Share this code instead</p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-accent">{manualCode}</p>
      </GlassCard>
    </div>
  )
}
