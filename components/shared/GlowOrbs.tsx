"use client"

import * as React from "react"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"

/**
 * Two blurred gradient orbs that subtly parallax toward the cursor —
 * the "Cyber-Conclave" background treatment. Mouse-only; static on touch
 * devices since there's no pointer to track.
 */
export function GlowOrbs() {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 40, damping: 20 })
  const springY = useSpring(y, { stiffness: 40, damping: 20 })

  const orb1X = useTransform(springX, (v) => v * 24)
  const orb1Y = useTransform(springY, (v) => v * 24)
  const orb2X = useTransform(springX, (v) => v * -44)
  const orb2Y = useTransform(springY, (v) => v * -44)

  React.useEffect(() => {
    function onMove(e: PointerEvent) {
      x.set(e.clientX / window.innerWidth - 0.5)
      y.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener("pointermove", onMove)
    return () => window.removeEventListener("pointermove", onMove)
  }, [x, y])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        style={{ x: orb1X, y: orb1Y }}
        className="absolute -top-40 -left-20 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[100px]"
      />
      <motion.div
        style={{ x: orb2X, y: orb2Y }}
        className="absolute top-1/2 -right-40 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-cyan/15 blur-[100px]"
      />
    </div>
  )
}
