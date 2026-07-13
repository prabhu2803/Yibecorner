"use client"

import * as React from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"

import { VibiMascot } from "@/features/vibi/VibiMascot"

const HERO_VIDEO_SRC = "/videos/vibe-corner-hero-intro.mp4"

/**
 * TV intro. Tries the real hero video first (muted autoplay, no controls);
 * if it's missing/blocked/fails, or the viewer prefers reduced motion, we
 * fall through to a GSAP-driven placeholder beat sequence built from Vibi
 * + the wordmark, so the app tells the same story today with zero real
 * assets. Never blocks render on the video promise — always resolves
 * within ~10s at most.
 */
export function HeroIntro({ onComplete }: { onComplete: () => void }) {
  const [mode, setMode] = React.useState<"probing" | "video" | "placeholder">("probing")
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const completedRef = React.useRef(false)

  const complete = React.useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    onComplete()
  }, [onComplete])

  React.useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) {
      complete()
      return
    }

    const video = videoRef.current
    if (!video) {
      setMode("placeholder")
      return
    }

    let settled = false
    const toPlaceholder = () => {
      if (settled) return
      settled = true
      setMode("placeholder")
    }
    const toVideo = () => {
      if (settled) return
      settled = true
      setMode("video")
    }

    const playPromise = video.play()
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(toVideo).catch(toPlaceholder)
    }

    // Autoplay policies can hang without ever resolving the promise on some
    // kiosk browsers — never wait more than 1.5s before falling through.
    const timeout = setTimeout(toPlaceholder, 1500)
    video.addEventListener("error", toPlaceholder)

    return () => {
      clearTimeout(timeout)
      video.removeEventListener("error", toPlaceholder)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useGSAP(
    () => {
      if (mode !== "placeholder") return

      const tl = gsap.timeline({ onComplete: complete })
      tl.from(".hero-vibi", { opacity: 0, scale: 0.6, duration: 0.9, ease: "back.out(1.7)" })
        .from(".hero-string", { scaleX: 0, opacity: 0, duration: 0.6, stagger: 0.12 }, "-=0.3")
        .to(".hero-vibi", { scale: 1.08, duration: 0.4, yoyo: true, repeat: 1 }, "-=0.2")
        .from(
          ".hero-title span",
          { opacity: 0, y: 20, filter: "blur(8px)", duration: 0.6, stagger: 0.05 },
          "-=0.2"
        )
        .from(".hero-logos", { opacity: 0, y: 12, duration: 0.6 }, "-=0.2")
        .to(".hero-vibi", { x: 60, y: -20, duration: 0.8, ease: "power1.inOut" }, "+=0.4")
        .to(".hero-scene", { opacity: 0, duration: 0.6 }, "+=0.3")
    },
    { dependencies: [mode], scope: containerRef }
  )

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <video
        ref={videoRef}
        src={HERO_VIDEO_SRC}
        muted
        playsInline
        className={mode === "video" ? "h-full w-full object-cover" : "hidden"}
        onEnded={complete}
      />

      {mode === "placeholder" && (
        <div className="hero-scene flex flex-col items-center gap-6">
          <div className="hero-vibi">
            <VibiMascot state="wake" size={180} />
          </div>
          <div className="flex gap-4">
            <span className="hero-string h-0.5 w-16 origin-left rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
            <span className="hero-string h-0.5 w-16 origin-left rounded-full bg-gradient-to-r from-transparent via-cyan to-transparent" />
            <span className="hero-string h-0.5 w-16 origin-left rounded-full bg-gradient-to-r from-transparent via-amber to-transparent" />
          </div>
          <h1 className="hero-title text-gradient-vibe text-6xl font-bold tracking-tight sm:text-7xl">
            {"VIBE CORNER".split("").map((char, i) => (
              <span key={i} className="inline-block">
                {char === " " ? " " : char}
              </span>
            ))}
          </h1>
          <div className="hero-logos flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <span>Straw Labs</span>
            <span className="glow-amber h-1.5 w-1.5 rounded-full bg-accent" />
            <span>YiFi</span>
          </div>
        </div>
      )}
    </div>
  )
}
