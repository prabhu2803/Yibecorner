export type VibiState =
  | "idle"
  | "wave"
  | "heart"
  | "celebrate"
  | "thinking"
  | "sleeping"
  | "wake"
  | "look_at_qr"

export interface VibiAsset {
  state: VibiState
  kind: "video" | "webm" | "image" | "placeholder"
  src?: string
  loop: boolean
  /** For non-looping reactive states, ms until we auto-return to idle. */
  returnToIdleAfterMs?: number
}
