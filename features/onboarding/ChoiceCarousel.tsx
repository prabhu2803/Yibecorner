"use client"

import * as React from "react"
import { motion } from "framer-motion"

import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"

export interface ChoiceCarouselOption {
  value: string
  /** Material Symbols Outlined ligature name, e.g. "rocket_launch". */
  icon: string
  label: string
  description: string
}

/**
 * Single-select "one card at a time" chooser — the shared visual language
 * for every choice-based onboarding step (Future Self, Industry, Business
 * Stage, Challenge Category), styled to match the Cyber-Conclave reference:
 * glass-panel card, neon-bordered active state, Material Symbols glyph in a
 * tinted circle. Exactly one card fills the frame at a time — no peeking
 * neighbor cards. Move between options via swipe or the arrow buttons.
 *
 * Free-text and multi-select steps don't use this: there's nothing to move
 * between for a name field, and forcing a 20-tag multi-select through
 * one-at-a-time cards would be slower than the toggle grid, working
 * against the "under 3 minutes" goal.
 */
export function ChoiceCarousel({
  options,
  value,
  onChange,
}: {
  options: readonly ChoiceCarouselOption[]
  value?: string
  onChange: (value: string) => void
}) {
  const [api, setApi] = React.useState<CarouselApi>()
  const [index, setIndex] = React.useState(0)

  React.useEffect(() => {
    if (!api) return
    const onSelect = () => setIndex(api.selectedScrollSnap())
    onSelect()
    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api])

  // If the field already has a value (editing / going back), start scrolled
  // to it instead of always resetting to the first card.
  React.useEffect(() => {
    if (!api || !value) return
    const i = options.findIndex((o) => o.value === value)
    if (i >= 0) api.scrollTo(i, true)
    // Only on mount/api-ready — user-driven scrolling shouldn't be fought.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api])

  const canPrev = index > 0
  const canNext = index < options.length - 1

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous"
          disabled={!canPrev}
          onClick={() => api?.scrollPrev()}
          className="cc-glass-panel flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--cc-on-surface)] transition disabled:opacity-30"
        >
          <MaterialIcon name="chevron_left" className="text-[20px]" />
        </button>

        <Carousel setApi={setApi} opts={{ loop: false }} className="w-full min-w-0">
          <CarouselContent>
            {options.map((option) => (
              <CarouselItem key={option.value} className="basis-full">
                <button
                  type="button"
                  onClick={() => onChange(option.value)}
                  className={`cc-glass-panel flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-2xl px-4 text-center transition ${
                    value === option.value
                      ? "cc-neon-primary !border-[var(--cc-primary)] bg-[rgba(221,183,255,0.08)]"
                      : ""
                  }`}
                >
                  <div className="flex size-16 items-center justify-center rounded-full bg-[rgba(221,183,255,0.1)] text-[var(--cc-primary)]">
                    <MaterialIcon name={option.icon} className="text-[32px]" />
                  </div>
                  <span className="cc-headline text-base font-semibold text-[var(--cc-on-surface)]">
                    {option.label}
                  </span>
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <button
          type="button"
          aria-label="Next"
          disabled={!canNext}
          onClick={() => api?.scrollNext()}
          className="cc-glass-panel flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--cc-on-surface)] transition disabled:opacity-30"
        >
          <MaterialIcon name="chevron_right" className="text-[20px]" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {options.map((option, i) => (
          <motion.button
            key={option.value}
            type="button"
            aria-label={`Go to ${option.label}`}
            onClick={() => api?.scrollTo(i)}
            animate={{ width: i === index ? 20 : 6, opacity: i === index ? 1 : 0.4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-1.5 rounded-full bg-[var(--cc-primary)]"
          />
        ))}
      </div>

      <div className="relative mt-4 h-10">
        {options.map((option, i) => (
          <motion.p
            key={option.value}
            animate={{ opacity: i === index ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-0 text-center text-sm text-[var(--cc-on-surface-variant)]"
          >
            {option.description}
          </motion.p>
        ))}
      </div>
    </div>
  )
}
