"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const discussionSchema = z.object({
  topic: z.string().trim().min(4).max(140),
  description: z.string().trim().max(1000).optional(),
  industry: z.string().trim().max(60).optional(),
})

export async function createDiscussion(
  eventSlug: string,
  eventId: string,
  input: z.infer<typeof discussionSchema>
) {
  const parsed = discussionSchema.safeParse(input)
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

  const { data: discussion, error } = await supabase
    .from("discussions")
    .insert({
      event_id: eventId,
      created_by: me.id,
      topic: parsed.data.topic,
      description: parsed.data.description || null,
      industry: parsed.data.industry || null,
    })
    .select("id")
    .single()

  if (error || !discussion) return { success: false as const, error: error?.message }

  await supabase.from("discussion_members").insert({ discussion_id: discussion.id, participant_id: me.id })

  revalidatePath(`/join/${eventSlug}/yibe/discussions`)
  return { success: true as const, discussionId: discussion.id }
}

export async function toggleDiscussionMembership(
  eventSlug: string,
  eventId: string,
  discussionId: string,
  joining: boolean
) {
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

  if (joining) {
    const { error } = await supabase
      .from("discussion_members")
      .insert({ discussion_id: discussionId, participant_id: me.id })
    if (error) return { success: false as const, error: error.message }
  } else {
    const { error } = await supabase
      .from("discussion_members")
      .delete()
      .eq("discussion_id", discussionId)
      .eq("participant_id", me.id)
    if (error) return { success: false as const, error: error.message }
  }

  revalidatePath(`/join/${eventSlug}/yibe/discussions/${discussionId}`)
  return { success: true as const }
}
