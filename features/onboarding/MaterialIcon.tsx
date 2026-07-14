import { cn } from "@/lib/utils"

/**
 * Renders a Material Symbols Outlined glyph by ligature name (e.g.
 * "rocket_launch"). Requires the Material Symbols Outlined stylesheet to be
 * loaded — see the <link> rendered in OnboardingForm, which React 19 hoists
 * into <head> regardless of where in the tree it's rendered.
 */
export function MaterialIcon({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={cn("material-symbols-outlined select-none", className)}>
      {name}
    </span>
  )
}
