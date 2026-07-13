"use client"

import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

interface Particle {
  id: number
  left: number
  size: number
  duration: number
  delay: number
  hue: "primary" | "amber" | "cyan"
}

const HUE_COLOR: Record<Particle["hue"], string> = {
  primary: "oklch(0.6 0.21 293)",
  amber: "oklch(0.78 0.15 70)",
  cyan: "oklch(0.78 0.12 200)",
}

function makeParticles(count: number): Particle[] {
  const hues: Particle["hue"][] = ["primary", "amber", "cyan"]
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: Math.random() * 100,
    size: 3 + Math.random() * 5,
    duration: 10 + Math.random() * 14,
    delay: Math.random() * 10,
    hue: hues[id % hues.length],
  }))
}

/** Ambient floating particles, purely decorative. Deterministic count, randomized per mount. */
export function ParticleField({
  count = 24,
  className,
}: {
  count?: number
  className?: string
}) {
  const [particles, setParticles] = React.useState<Particle[]>([])
  React.useEffect(() => {
    setParticles(makeParticles(count))
  }, [count])

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: HUE_COLOR[p.hue],
            boxShadow: `0 0 ${p.size * 2}px ${HUE_COLOR[p.hue]}`,
          }}
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: "-10%", opacity: [0, 0.8, 0.8, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  )
}
