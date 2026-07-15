"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"

/**
 * Camera capture for the Future Self souvenir — opens the front camera,
 * lets the participant frame a selfie, and returns a JPEG data URL.
 * Never blocks onboarding: permission denial, no camera, or any
 * getUserMedia failure all surface as a "Skip" path rather than a dead
 * end, matching generateFutureSelfImage's own graceful-degradation
 * philosophy (falls back to a text-only illustration with no photo).
 */
export function SelfieCapture({
  onCapture,
  onSkip,
}: {
  onCapture: (dataUrl: string) => void
  onSkip: () => void
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const [captured, setCaptured] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [starting, setStarting] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setStarting(false)
      } catch (err) {
        if (cancelled) return
        console.error("SelfieCapture: getUserMedia failed:", err)
        setError(
          err instanceof Error && err.name === "NotAllowedError"
            ? "Camera access was denied."
            : "Couldn't access a camera on this device."
        )
        setStarting(false)
      }
    }

    void start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  function capture() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    // Mirror the capture so it matches what the participant saw in the
    // (mirrored) preview, rather than a flipped photo.
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setCaptured(canvas.toDataURL("image/jpeg", 0.85))
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  function retake() {
    setCaptured(null)
    setStarting(true)
    setError(null)
    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setStarting(false)
      })
      .catch((err) => {
        console.error("SelfieCapture: retake getUserMedia failed:", err)
        setError("Couldn't access a camera on this device.")
        setStarting(false)
      })
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
      <div className="cc-glass-panel relative flex aspect-square w-full max-w-xs items-center justify-center overflow-hidden rounded-3xl">
        {error ? (
          <div className="flex flex-col items-center gap-3 p-6">
            <MaterialIcon name="videocam_off" className="text-[40px] text-[var(--cc-on-surface-variant)]" />
            <p className="text-sm text-[var(--cc-on-surface-variant)]">{error}</p>
          </div>
        ) : captured ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={captured} alt="Your selfie" className="size-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="size-full -scale-x-100 object-cover"
          />
        )}
        {starting && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--cc-surface)]/60">
            <MaterialIcon name="videocam" className="animate-pulse text-[32px] text-[var(--cc-secondary)]" />
          </div>
        )}
      </div>

      <div>
        <h2 className="cc-headline text-xl font-bold text-[var(--cc-on-surface)]">Strike a pose</h2>
        <p className="mt-1 text-sm text-[var(--cc-on-surface-variant)]">
          Your Future Self souvenir will be styled from this photo.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        {error ? (
          <Button
            onClick={onSkip}
            className="cc-neon-primary h-14 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
          >
            Continue without a photo
          </Button>
        ) : captured ? (
          <>
            <Button
              onClick={() => onCapture(captured)}
              className="cc-neon-primary h-14 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
            >
              Use this photo
            </Button>
            <Button type="button" variant="outline" onClick={retake} className="cc-glass-panel rounded-xl">
              Retake
            </Button>
          </>
        ) : (
          <Button
            disabled={starting}
            onClick={capture}
            className="cc-neon-primary h-14 gap-1.5 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
          >
            <MaterialIcon name="photo_camera" className="text-[18px]" />
            Capture
          </Button>
        )}
        {!captured && (
          <button
            type="button"
            onClick={onSkip}
            className="cc-label-tech text-[11px] tracking-widest text-[var(--cc-on-surface-variant)] uppercase"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  )
}
