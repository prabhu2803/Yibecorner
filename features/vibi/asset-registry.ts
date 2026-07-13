import type { VibiAsset, VibiState } from "./types"

// The swap-later contract: drop real static images at these exact paths and
// every <VibiMascot state="..."/> call site in the app picks them up with
// zero code changes (VibiMascot.tsx animates any `kind: "image"` asset with
// a continuous breathing loop). Until a state's file exists, `onError` on
// the <img> falls back to a Framer Motion "breathing gradient orb" that
// already reads as "a magical floating AI spirit."
export const vibiAssetRegistry: Record<VibiState, VibiAsset> = {
  idle: { state: "idle", kind: "image", src: "/vibi/idle.png", loop: true },
  wave: {
    state: "wave",
    kind: "image",
    src: "/vibi/wave.png",
    loop: false,
    returnToIdleAfterMs: 2400,
  },
  heart: {
    state: "heart",
    kind: "image",
    src: "/vibi/heart.png",
    loop: false,
    returnToIdleAfterMs: 2400,
  },
  celebrate: {
    state: "celebrate",
    kind: "image",
    src: "/vibi/celebrate.png",
    loop: false,
    returnToIdleAfterMs: 3200,
  },
  thinking: {
    state: "thinking",
    kind: "image",
    src: "/vibi/thinking.png",
    loop: false,
    returnToIdleAfterMs: 2400,
  },
  sleeping: { state: "sleeping", kind: "image", src: "/vibi/sleeping.png", loop: true },
  wake: {
    state: "wake",
    kind: "image",
    src: "/vibi/wake.png",
    loop: false,
    returnToIdleAfterMs: 1600,
  },
  look_at_qr: {
    state: "look_at_qr",
    kind: "image",
    src: "/vibi/look-at-qr.png",
    loop: true,
  },
}

export function getVibiAsset(state: VibiState): VibiAsset {
  return vibiAssetRegistry[state]
}
