"use client"

import * as React from "react"
import { Scanner, type IScannerError, type ScannerErrorKind } from "@yudiel/react-qr-scanner"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AppTopBar } from "@/components/shared/AppTopBar"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"
import { sendConnectionRequest } from "@/features/connections/actions"

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

interface ResolvedParticipant {
  id: string
  fullName: string
  company: string | null
  designation: string | null
  industry: string
}

export function ScanFlow({
  eventSlug,
  eventId,
  initial = "?",
}: {
  eventSlug: string
  eventId: string
  initial?: string
}) {
  const [paused, setPaused] = React.useState(false)
  const [manualCode, setManualCode] = React.useState("")
  const [resolving, setResolving] = React.useState(false)
  const [cameraError, setCameraError] = React.useState<IScannerError | null>(null)
  const [resolvedMethod, setResolvedMethod] = React.useState<"qr" | "manual">("qr")
  const [resolved, setResolved] = React.useState<ResolvedParticipant | null>(null)
  const [message, setMessage] = React.useState("")
  const [sending, setSending] = React.useState(false)

  async function resolveToken(scannedToken: string, method: "qr" | "manual") {
    setResolving(true)
    setPaused(true)
    try {
      const res = await fetch("/api/connections/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug, scannedToken }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Could not identify that code")
        return
      }

      setResolvedMethod(method)
      setResolved(data.participant)
    } finally {
      setResolving(false)
      setTimeout(() => setPaused(false), 1200)
    }
  }

  async function handleSend() {
    if (!resolved) return
    setSending(true)
    const result = await sendConnectionRequest(eventSlug, eventId, {
      recipientParticipantId: resolved.id,
      message,
      initiatedVia: resolvedMethod,
    })
    setSending(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success(`Request sent to ${resolved.fullName} — find them and say hi!`)
    setResolved(null)
    setMessage("")
    setManualCode("")
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
                if (rawValue && !resolving) {
                  void resolveToken(extractToken(rawValue), "qr")
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
              disabled={manualCode.length < 4 || resolving}
              onClick={() => resolveToken(manualCode.toLowerCase(), "manual")}
            >
              Connect
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!resolved} onOpenChange={(open) => !open && setResolved(null)}>
        <DialogContent className="cc-scope rounded-2xl border border-white/10 bg-[var(--cc-surface)] text-[var(--cc-on-surface)]">
          <DialogHeader>
            <DialogTitle className="cc-headline text-base font-bold text-[var(--cc-on-surface)]">
              Connect with {resolved?.fullName}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--cc-on-surface-variant)]">
            {resolved?.designation ? `${resolved.designation}` : ""}
            {resolved?.designation && resolved?.company ? " at " : ""}
            {resolved?.company ?? ""}
          </p>
          <Textarea
            placeholder="Optional message, e.g. I'd love to discuss AI for manufacturing."
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <DialogFooter className="rounded-b-2xl border-t border-white/10 bg-transparent">
            <Button
              className="cc-glass-panel rounded-xl text-[var(--cc-on-surface-variant)]"
              onClick={() => setResolved(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={sending}
              onClick={handleSend}
              className="cc-neon-primary rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
            >
              {sending ? "Sending..." : "Send Connection Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
