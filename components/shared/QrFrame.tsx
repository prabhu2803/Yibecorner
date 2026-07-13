"use client"

import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

/**
 * Decorative animated frame around a QR code. Per design.md, the QR content
 * itself must never move/animate (it breaks scanability) — only this
 * surrounding frame does.
 */
export function QrFrame({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("relative inline-flex items-center justify-center p-6", className)}>
      <motion.div
        aria-hidden
        className="glow-cyan absolute inset-0 rounded-3xl border-2 border-cyan/40"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      {[
        "top-2 left-2 border-t-2 border-l-2 rounded-tl-lg",
        "top-2 right-2 border-t-2 border-r-2 rounded-tr-lg",
        "bottom-2 left-2 border-b-2 border-l-2 rounded-bl-lg",
        "bottom-2 right-2 border-b-2 border-r-2 rounded-br-lg",
      ].map((corner) => (
        <span
          key={corner}
          aria-hidden
          className={cn("absolute h-6 w-6 border-accent", corner)}
        />
      ))}
      <div className="glass-card relative z-10 rounded-2xl bg-white p-4">{children}</div>
    </div>
  )
}
