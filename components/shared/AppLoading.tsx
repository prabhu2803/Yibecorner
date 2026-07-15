import { VibiMascot } from "@/features/vibi/VibiMascot"

/**
 * Shared loading.tsx content for every /join/[eventSlug]/(app)/* route
 * segment — every one of these pages is server-rendered on demand with a
 * real Supabase fetch, so without this a click just sits on the old
 * screen with no feedback until the round-trip finishes. Same
 * VibiMascot "thinking" treatment ProfileForm's own loading branch
 * already used, just promoted to a shared component instead of a
 * per-file copy.
 */
export function AppLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <VibiMascot state="thinking" size={96} />
    </div>
  )
}
