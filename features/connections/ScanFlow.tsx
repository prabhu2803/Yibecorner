"use client"

import * as React from "react"
import { Scanner, type IScannerError, type ScannerErrorKind } from "@yudiel/react-qr-scanner"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AppTopBar } from "@/components/shared/AppTopBar"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"
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

// Mirrors @yudiel/react-qr-scanner's ScannerErrorKind — surfaced as a
// persistent banner (not just a toast) since a denied/unavailable camera
// is a state the participant needs to actively resolve, not a one-off
// blip they can dismiss and forget about.
const CAMERA_ERROR_COPY: Record<ScannerErrorKind, string> = {
  "permission-denied":
    "Camera access is blocked. Enable camera permission for this site in your phone's browser settings, then reload this page.",
  "no-camera": "No camera found on this device — use the manual code below instead.",
  "in-use": "Your camera is being used by another app. Close it and try again.",
  "insecure-context": "Camera scanning needs a secure (https) connection.",
  unsupported: "Your browser doesn't support camera scanning here — use the manual code below.",
  overconstrained: "Couldn't start the camera with the requested settings — use the manual code below.",
  security: "Camera access was blocked for security reasons — use the manual code below.",
  aborted: "Camera start was interrupted — try again or use the manual code below.",
  "type-error": "Something went wrong starting the camera — use the manual code below.",
  unknown: "Camera unavailable — use the manual code below.",
}

export function ScanFlow({ eventSlug, initial = "?" }: { eventSlug: string; initial?: string }) {
  const [paused, setPaused] = React.useState(false)
  const [manualCode, setManualCode] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [cameraError, setCameraError] = React.useState<IScannerError | null>(null)
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
    <div className="-mx-4 flex flex-1 flex-col bg-[var(--cc-surface)]">
      <AppTopBar homeHref={`/join/${eventSlug}/home`} profileHref={`/join/${eventSlug}/profile`} initial={initial} />

      <div className="flex flex-col gap-4 px-4 py-6">
        <div>
          <h1 className="cc-headline text-xl font-bold text-[var(--cc-on-surface)]">Scan to Connect</h1>
          <p className="text-sm text-[var(--cc-on-surface-variant)]">
            Point your camera at the other person&apos;s QR code.
          </p>
        </div>

        {cameraError && (
          <div className="cc-glass-panel flex items-start gap-3 rounded-2xl border-[rgba(255,180,171,0.4)] p-4">
            <MaterialIcon name="error" className="mt-0.5 shrink-0 text-[20px] text-[#ffb4ab]" />
            <p className="text-sm text-[var(--cc-on-surface)]">{CAMERA_ERROR_COPY[cameraError.kind]}</p>
          </div>
        )}

        {!cameraError && (
          <div className="cc-glass-panel cc-neon-secondary overflow-hidden rounded-2xl">
            <Scanner
              onScan={(codes) => {
                const rawValue = codes[0]?.rawValue
                if (rawValue && !submitting) {
                  void submitToken(extractToken(rawValue), "qr")
                }
              }}
              onError={(error) => {
                setCameraError(error)
                toast.error("Camera unavailable — use the manual code below")
              }}
              paused={paused}
              formats={["qr_code"]}
              styles={{ container: { borderRadius: "1rem" } }}
            />
          </div>
        )}

        <div className="cc-glass-panel flex flex-col gap-3 rounded-2xl p-4">
          <p className="cc-label-tech text-[11px] tracking-widest text-[var(--cc-on-surface-variant)] uppercase">
            Bad lighting? Enter their 8-character code
          </p>
          <div className="flex gap-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="ABCD1234"
              className="font-mono uppercase"
              maxLength={8}
            />
            <Button
              className="cc-neon-primary rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
              disabled={manualCode.length < 4 || submitting}
              onClick={() => submitToken(manualCode.toLowerCase(), "manual")}
            >
              Connect
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
