"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Heart, Lightbulb, Moon, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { getVibiAsset } from "./asset-registry"
import type { VibiState } from "./types"

const STATE_TINT: Record<VibiState, string> = {
  idle: "from-[oklch(0.6_0.21_293)] to-[oklch(0.5_0.18_293)]",
  wave: "from-[oklch(0.78_0.12_200)] to-[oklch(0.6_0.21_293)]",
  heart: "from-[oklch(0.78_0.15_70)] to-[oklch(0.65_0.2_340)]",
  celebrate: "from-[oklch(0.78_0.15_70)] to-[oklch(0.78_0.12_200)]",
  thinking: "from-[oklch(0.5_0.15_293)] to-[oklch(0.4_0.1_293)]",
  sleeping: "from-[oklch(0.35_0.03_288)] to-[oklch(0.25_0.03_288)]",
  wake: "from-[oklch(0.72_0.16_293)] to-[oklch(0.6_0.21_293)]",
  look_at_qr: "from-[oklch(0.6_0.21_293)] to-[oklch(0.78_0.12_200)]",
}

function StateIcon({ state }: { state: VibiState }) {
  const className = "size-1/4 text-white/90 drop-shadow-lg"
  switch (state) {
    case "heart":
      return <Heart className={className} fill="currentColor" />
    case "celebrate":
      return <Sparkles className={className} />
    case "thinking":
      return <Lightbulb className={className} />
    case "sleeping":
      return <Moon className={className} />
    default:
      return null
  }
}

export interface VibiMascotProps {
  state: VibiState
  className?: string
  /** px size of the mascot's bounding box. Defaults to responsive sizing via className. */
  size?: number
}

/**
 * The entire call-site API for Vibi. Swapping in real animations later
 * (Rive/Lottie/video) only ever touches asset-registry.ts and the "video"/
 * "webm" branch below — never the ~20 places that render <VibiMascot/>.
 */
export function VibiMascot({ state, className, size }: VibiMascotProps) {
  const asset = getVibiAsset(state)
  const [assetFailed, setAssetFailed] = React.useState(false)

  const showPlaceholder = asset.kind === "placeholder" || assetFailed

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={size ? { width: size, height: size } : undefined}
      data-vibi-state={state}
    >
      <AnimatePresence mode="wait">
        {showPlaceholder ? (
          <motion.div
            key={`placeholder-${state}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative flex h-full w-full items-center justify-center"
          >
            <div
              className={cn(
                "animate-vibi-breathe glow-primary flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br",
                STATE_TINT[state]
              )}
            >
              <StateIcon state={state} />
            </div>
          </motion.div>
        ) : asset.kind === "image" ? (
          <motion.img
            key={`asset-${state}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
              opacity: 1,
              scale: [1, 1.04, 1],
              y: [0, -8, 0],
            }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{
              opacity: { duration: 0.35, ease: "easeOut" },
              scale: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
              y: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
            }}
            className="h-full w-full object-contain"
            src={asset.src}
            alt=""
            onError={() => setAssetFailed(true)}
          />
        ) : (
          <motion.video
            key={`asset-${state}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="h-full w-full object-contain"
            src={asset.src}
            autoPlay
            muted
            playsInline
            loop={asset.loop}
            onError={() => setAssetFailed(true)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
