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
    designation,
    city,
    mobileNumber,
    whatsappSameAsMobile,
    whatsappNumber,
    industry,
    industryOther,
    businessStage,
    lookingFor,
    canHelpWith,
    biggestChallenge,
    challengeCategory,
    futureSelfAspiration,
  } = parsed.data

  const { data: participant, error } = await supabase
    .from("event_participants")
    .upsert(
      {
        event_id: eventId,
        user_id: user.id,
        full_name: fullName,
        company: company || null,
        designation: designation || null,
        city: city || null,
        industry,
        industry_other: industry === "other" ? industryOther || null : null,
        business_stage: businessStage,
        looking_for: lookingFor,
        can_help_with: canHelpWith,
        biggest_challenge: biggestChallenge || null,
        challenge_category: challengeCategory || null,
        future_self_aspiration: futureSelfAspiration || null,
        onboarding_completed_at: new Date().toISOString(),
      },
      { onConflict: "event_id,user_id" }
    )
    .select("*")
    .single()

  if (error || !participant) {
    return { success: false as const, error: error?.message ?? "Could not save profile" }
  }

  const { error: contactsError } = await supabase.from("participant_contacts").upsert(
    {
      participant_id: participant.id,
      event_id: eventId,
      mobile_number: mobileNumber,
      whatsapp_number: whatsappSameAsMobile ? mobileNumber : (whatsappNumber ?? mobileNumber),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "participant_id" }
  )

  if (contactsError) {
    return { success: false as const, error: contactsError.message }
  }

  // The profile save above is the critical path — it already succeeded by
  // this point. Analytics and match computation are best-effort: a failure
  // here (e.g. a misconfigured service-role key) must not turn a successful
  // onboarding save into a 500 for the participant.
  try {
    await supabase.from("analytics_events").insert({
      event_id: eventId,
      participant_id: participant.id,
      event_name: "onboarding_completed",
      metadata: { industry, business_stage: businessStage },
    })
  } catch (err) {
    console.error("onboarding_completed analytics insert failed:", err)
  }

  try {
    // Awaited (not fire-and-forget) so the participant's /matches page has
    // results the moment they land on it, when this succeeds.
    await computeMatchesForParticipant(eventId, participant.id)
  } catch (err) {
    console.error("computeMatchesForParticipant failed:", err)
  }

  return { success: true as const, participant }
}
