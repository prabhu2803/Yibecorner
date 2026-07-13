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
              "rounded-full border px-3 py-1.5 text-sm font-medium transition",
              selected
                ? "glow-primary border-primary bg-primary text-primary-foreground"
                : "border-white/15 bg-white/5 text-muted-foreground hover:bg-white/10"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
