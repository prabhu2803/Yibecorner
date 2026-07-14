"use client"

import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"
import type { ChoiceCarouselOption } from "@/features/onboarding/ChoiceCarousel"

/**
 * Single-select tile grid — all options visible at once (icon + label),
 * tapped directly rather than swiped through one at a time. Reuses
 * ChoiceCarouselOption so the same INDUSTRY_META-style data source can
 * back either presentation; only the onboarding step decides which one
 * to render. Selected tile gets the same primary neon-glow treatment as
 * ChoiceCarousel's active card, keeping single-select cyan-free — cyan is
 * reserved for TagToggleGroup's multi-select chips.
 */
export function ChoiceGrid({
  options,
  value,
  onChange,
}: {
  options: readonly ChoiceCarouselOption[]
  value?: string
  onChange: (value: string) => void
}) {
  const selected = options.find((o) => o.value === value)

  return (
    <div className="min-w-0">
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "cc-glass-panel flex flex-col items-center justify-center gap-2 rounded-2xl px-2 py-4 text-center transition",
                isSelected
                  ? "cc-neon-primary !border-[var(--cc-primary)] bg-[rgba(221,183,255,0.08)] text-[var(--cc-primary)]"
                  : "text-[var(--cc-on-surface-variant)]"
              )}
            >
              <MaterialIcon name={option.icon} className="text-[22px]" />
              <span className="cc-label-tech text-[10px] tracking-wide uppercase">{option.label}</span>
            </button>
          )
        })}
      </div>

      <div className="relative mt-4 min-h-10">
        <AnimatePresence mode="wait">
          {selected && (
            <motion.p
              key={selected.value}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-center text-sm text-[var(--cc-on-surface-variant)]"
            >
              {selected.description}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
