"use client"

import { cn } from "@/lib/utils"

export function TagToggleGroup<T extends string>({
  options,
  value,
  onChange,
  max,
}: {
  options: readonly { value: T; label: string }[]
  value: T[]
  onChange: (next: T[]) => void
  max?: number
}) {
  function toggle(tag: T) {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag))
    } else if (!max || value.length < max) {
      onChange([...value, tag])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={cn(
              "cc-glass-panel cc-label-tech rounded-full px-3.5 py-1.5 text-xs uppercase transition",
              selected
                ? "cc-neon-secondary !border-[var(--cc-secondary)] bg-[rgba(0,203,230,0.12)] text-[var(--cc-secondary)]"
                : "text-[var(--cc-on-surface-variant)] hover:border-[rgba(93,230,255,0.4)]"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
