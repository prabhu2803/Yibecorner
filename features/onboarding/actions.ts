"use server"

import { onboardingSchema, type OnboardingInput } from "@/features/onboarding/schema"
import { computeMatchesForParticipant } from "@/features/matchmaking/actions"
import { createClient } from "@/lib/supabase/server"

export async function completeOnboarding(eventId: string, input: OnboardingInput) {
  const parsed = onboardingSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false as const, error: "Not signed in" }
  }

  const {
    fullName,
    company,
    industry,
    businessStage,
    lookingFor,
    canHelpWith,
    biggestChallenge,
  } = parsed.data

  const { data: participant, error } = await supabase
    .from("event_participants")
    .upsert(
      {
        event_id: eventId,
        user_id: user.id,
        full_name: fullName,
        company: company || null,
        industry,
        business_stage: businessStage,
        looking_for: lookingFor,
        can_help_with: canHelpWith,
        biggest_challenge: biggestChallenge || null,
        onboarding_completed_at: new Date().toISOString(),
      },
      { onConflict: "event_id,user_id" }
    )
    .select("*")
    .single()

  if (error || !participant) {
    return { success: false as const, error: error?.message ?? "Could not save profile" }
  }

  await supabase.from("analytics_events").insert({
    event_id: eventId,
    participant_id: participant.id,
    event_name: "onboarding_completed",
    metadata: { industry, business_stage: businessStage },
  })

  // Fire-and-forget from the caller's perspective, but awaited here so the
  // participant's /matches page has results the moment they land on it.
  await computeMatchesForParticipant(eventId, participant.id)

  return { success: true as const, participant }
}
