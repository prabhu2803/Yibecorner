"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"

/**
 * Wizard-step shell — rounded card, subtle grain texture, slide/fade
 * transition between steps. Visual language adapted from a PromoCard-style
 * component; content is a children slot instead of a fixed label/title/button
 * since these hold arbitrary form fields.
 */
export function StepCard({
  stepKey,
  direction = 1,
  className,
  children,
}: {
  /** Unique per-step key so AnimatePresence knows to transition on change. */
  stepKey: string | number
  /** 1 = advancing (slide in from right), -1 = going back (slide in from left). */
  direction?: 1 | -1
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={stepKey}
          initial={{ opacity: 0, x: direction > 0 ? 24 : -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -24 : 24, transition: { duration: 0.2 } }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={cn(
            "relative w-full rounded-2xl border border-white/10 bg-card p-6 text-card-foreground shadow-lg",
            className
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.03] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
          <div className="relative z-10">{children}</div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
