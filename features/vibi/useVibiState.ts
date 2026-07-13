"use client"

import { create } from "zustand"

import { getVibiAsset } from "./asset-registry"
import type { VibiState } from "./types"

interface VibiStore {
  state: VibiState
  /** Set the mascot's state directly, with no auto-return-to-idle. */
  setState: (state: VibiState) => void
  /**
   * React to a live event (e.g. a realtime activity row). Switches to the
   * given state, then automatically returns to idle after the duration
   * configured in the asset registry for non-looping states.
   */
  react: (state: VibiState) => void
}

let returnTimeout: ReturnType<typeof setTimeout> | null = null

export const useVibiState = create<VibiStore>((set) => ({
  state: "idle",
  setState: (state) => {
    if (returnTimeout) clearTimeout(returnTimeout)
    set({ state })
  },
  react: (state) => {
    if (returnTimeout) clearTimeout(returnTimeout)
    set({ state })

    const asset = getVibiAsset(state)
    if (!asset.loop && asset.returnToIdleAfterMs) {
      returnTimeout = setTimeout(() => {
        set({ state: "idle" })
      }, asset.returnToIdleAfterMs)
    }
  },
}))
