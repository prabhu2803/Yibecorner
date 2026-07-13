import * as React from "react"

import { cn } from "@/lib/utils"

export const GlassCard = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  function GlassCard({ className, ...props }, ref) {
    return <div ref={ref} className={cn("glass-card p-6", className)} {...props} />
  }
)
