"use client"

import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"

export function LiveCounter({
  label,
  value,
  icon,
  className,
  variant = "card",
}: {
  label: string
  value: number
  icon?: React.ReactNode
  className?: string
  /** "plain" drops the card chrome for use in quieter, breathing-room layouts. */
  variant?: "card" | "plain"
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 text-center",
        variant === "card" && "glass-card px-4 py-3",
        className
      )}
    >
      {icon && <div className="text-accent">{icon}</div>}
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ opacity: 0, y: -8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl"
        >
          {value.toLocaleString()}
        </motion.span>
      </AnimatePresence>
      <span className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</span>
    </div>
  )
}
