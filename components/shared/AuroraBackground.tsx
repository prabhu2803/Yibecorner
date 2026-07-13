import { cn } from "@/lib/utils"

/**
 * Fixed full-bleed aurora backdrop. Mount once near the root of a page —
 * it's `-z-10` and `fixed`, so it never affects layout or scroll.
 */
export function AuroraBackground({ className }: { className?: string }) {
  return <div aria-hidden className={cn("aurora-bg fixed inset-0 -z-10", className)} />
}
