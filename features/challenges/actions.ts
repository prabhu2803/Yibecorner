"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const challengeSchema = z.object({
  title: z.string().trim().min(4).max(140),
  description: z.string().trim().min(10).max(2000),
  category: z.string().trim().max(60).optional(),
})

export async function createChallenge(
  eventSlug: string,
  eventId: string,
  input: z.infer<typeof challengeSchema>
) {
  const parsed = challengeSchema.safeParse(input)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: "Not signed in" }

  const { data: me } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!me) return { success: false as const, error: "Complete onboarding first" }

  const { error } = await supabase.from("challenges").insert({
    event_id: eventId,
    author_id: me.id,
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category || null,
  })

  if (error) return { success: false as const, error: error.message }
  revalidatePath(`/join/${eventSlug}/yibe/challenges`)
  return { success: true as const }
}

const responseSchema = z.object({
  body: z.string().trim().min(2).max(1000),
  isIntroductionOffer: z.boolean().default(false),
})

export async function createChallengeResponse(
  eventSlug: string,
  eventId: string,
  challengeId: string,
  input: z.infer<typeof responseSchema>
) {
  const parsed = responseSchema.safeParse(input)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: "Not signed in" }

  const { data: me } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!me) return { success: false as const, error: "Complete onboarding first" }

  const { error } = await supabase.from("challenge_responses").insert({
    challenge_id: challengeId,
    author_id: me.id,
    body: parsed.data.body,
    is_introduction_offer: parsed.data.isIntroductionOffer,
  })

  if (error) return { success: false as const, error: error.message }
  revalidatePath(`/join/${eventSlug}/yibe/challenges/${challengeId}`)
  return { success: true as const }
}

export async function markChallengeSolved(
  eventSlug: string,
  challengeId: string,
  responseId: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: "Not signed in" }

  // Authorship and "does this response actually belong to this challenge"
  // are both verified inside the RPC (mark_challenge_solved, security
  // definer) — status/solved_by_response_id are no longer client-grantable
  // columns, precisely so this can't be spoofed via a raw .update() call.
  const { error } = await supabase.rpc("mark_challenge_solved", {
    p_challenge_id: challengeId,
    p_response_id: responseId,
  })

  if (error) return { success: false as const, error: error.message }
  revalidatePath(`/join/${eventSlug}/yibe/challenges/${challengeId}`)
  return { success: true as const }
}
