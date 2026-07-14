"use server"

import { normalizePhone, onboardingSchema, type OnboardingInput } from "@/features/onboarding/schema"
import { computeMatchesForParticipant } from "@/features/matchmaking/actions"
import { CHALLENGE_CATEGORY_META, type ChallengeCategory } from "@/lib/constants"
import { createClient } from "@/lib/supabase/server"

// Derives a short challenge-post title from the free-text answer, since the
// onboarding question ("what's the one thing...") is one field but a
// challenges-table post needs a separate title + description.
function deriveChallengeTitle(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= 100) return trimmed
  const cut = trimmed.slice(0, 100)
  const lastSpace = cut.lastIndexOf(" ")
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : 100)}…`
}

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

  const normalizedMobile = normalizePhone(mobileNumber)
  const normalizedWhatsapp = whatsappSameAsMobile
    ? normalizedMobile
    : normalizePhone(whatsappNumber ?? mobileNumber)

  // Does this session already have its own participant row for this event?
  const { data: existing } = await supabase
    .from("event_participants")
    .select("onboarding_completed_at")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle()

  // Only attempt the phone-based merge when this session has no row of its
  // own yet — i.e. a genuine first-time-on-this-device onboarding, which is
  // the "same person, new device" scenario this exists for. Deliberately
  // NOT run on profile edits (existing session): an already-onboarded user
  // editing their profile and typing someone else's phone number must
  // never be able to reassign that other person's participant record to
  // themselves. Anonymous auth means "identity" is a browser session, not
  // a person — see find_or_claim_participant_by_phone in
  // 0020_phone_match_claim_participant.sql for the reassignment itself.
  // After this call, the upsert below naturally lands on that same row —
  // no separate "update by id" path needed.
  let priorCompletedAt = existing?.onboarding_completed_at ?? null
  if (!existing) {
    try {
      const { data: claimedId } = await supabase.rpc("find_or_claim_participant_by_phone", {
        p_event_id: eventId,
        p_mobile_number: normalizedMobile,
      })
      if (claimedId) {
        // A match was found and reassigned to this session — check *that*
        // participant's own completion status, not this (previously
        // nonexistent) session's, so a merged returning user isn't
        // misclassified as "first completion" and re-posted to YIBE Corner.
        const { data: claimed } = await supabase
          .from("event_participants")
          .select("onboarding_completed_at")
          .eq("id", claimedId)
          .maybeSingle()
        priorCompletedAt = claimed?.onboarding_completed_at ?? null
      }
    } catch (err) {
      console.error("find_or_claim_participant_by_phone failed:", err)
    }
  }

  // Only auto-post the onboarding challenge to YIBE Corner the very first
  // time someone completes onboarding — otherwise every profile edit (or a
  // phone-matched re-onboard on a new device) would spam a duplicate post.
  const isFirstCompletion = !priorCompletedAt

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
      mobile_number: normalizedMobile,
      whatsapp_number: normalizedWhatsapp,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "participant_id" }
  )

  if (contactsError) {
    return { success: false as const, error: contactsError.message }
  }

  if (isFirstCompletion && biggestChallenge?.trim()) {
    try {
      await supabase.from("challenges").insert({
        event_id: eventId,
        author_id: participant.id,
        title: deriveChallengeTitle(biggestChallenge),
        description: biggestChallenge.trim(),
        category: challengeCategory ? CHALLENGE_CATEGORY_META[challengeCategory as ChallengeCategory].label : null,
      })
    } catch (err) {
      console.error("auto-posting onboarding challenge failed:", err)
    }
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
