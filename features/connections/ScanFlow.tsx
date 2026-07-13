"use client"

import * as React from "react"
import { Scanner } from "@yudiel/react-qr-scanner"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GlassCard } from "@/components/shared/GlassCard"
import { useVibiState } from "@/features/vibi/useVibiState"

function extractToken(rawValue: string): string {
  try {
    const url = new URL(rawValue)
    const token = url.searchParams.get("token")
    if (token) return token
  } catch {
    // Not a URL — treat the raw scanned value as the token/manual code.
  }
  return rawValue
}

export function ScanFlow({ eventSlug }: { eventSlug: string }) {
  const [paused, setPaused] = React.useState(false)
  const [manualCode, setManualCode] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const react = useVibiState((s) => s.react)

  async function submitToken(scannedToken: string, method: "qr" | "manual") {
    setSubmitting(true)
    setPaused(true)
    try {
      const res = await fetch("/api/connections/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug, scannedToken, method }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Could not connect")
        return
      }

      if (data.status === "verified") {
        react("heart")
        toast.success("Connection verified!")
      } else {
        toast("Scan sent — waiting for them to confirm", { icon: "⏳" })
      }
    } finally {
      setSubmitting(false)
      setTimeout(() => setPaused(false), 1200)
    }
  }

  return (
    <div className="flex flex-col gap-4 py-6">
      <h1 className="text-xl font-bold">Scan to Connect</h1>
      <p className="text-sm text-muted-foreground">
        Point your camera at the other person&apos;s QR code.
      </p>

      <div className="glass-card overflow-hidden rounded-2xl">
        <Scanner
          onScan={(codes) => {
            const rawValue = codes[0]?.rawValue
            if (rawValue && !submitting) {
              void submitToken(extractToken(rawValue), "qr")
            }
          }}
          onError={() => toast.error("Camera unavailable — use the manual code below")}
          paused={paused}
          formats={["qr_code"]}
          styles={{ container: { borderRadius: "1rem" } }}
        />
      </div>

      <GlassCard className="flex flex-col gap-3">
        <p className="text-sm font-medium">Bad lighting? Enter their 8-character code</p>
        <div className="flex gap-2">
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="ABCD1234"
            className="font-mono uppercase"
            maxLength={8}
          />
          <Button
            disabled={manualCode.length < 4 || submitting}
            onClick={() => submitToken(manualCode.toLowerCase(), "manual")}
          >
            Connect
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}
