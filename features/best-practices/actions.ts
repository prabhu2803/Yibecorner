"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const practiceSchema = z.object({
  title: z.string().trim().min(4).max(140),
  body: z.string().trim().min(10).max(2000),
  category: z.string().trim().max(60).optional(),
})

export async function createBestPractice(
  eventSlug: string,
  eventId: string,
  input: z.infer<typeof practiceSchema>
) {
  const parsed = practiceSchema.safeParse(input)
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

  const { error } = await supabase.from("best_practices").insert({
    event_id: eventId,
    author_id: me.id,
    title: parsed.data.title,
    body: parsed.data.body,
    category: parsed.data.category || null,
  })

  if (error) return { success: false as const, error: error.message }
  revalidatePath(`/join/${eventSlug}/yibe/best-practices`)
  return { success: true as const }
}

export async function toggleUpvote(practiceId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("toggle_upvote", { p_best_practice_id: practiceId })
  if (error) return { success: false as const, error: error.message }
  return { success: true as const, upvoted: data as boolean }
}

export async function toggleSave(practiceId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("toggle_save", { p_best_practice_id: practiceId })
  if (error) return { success: false as const, error: error.message }
  return { success: true as const, saved: data as boolean }
}

const commentSchema = z.object({ body: z.string().trim().min(1).max(500) })

export async function addComment(eventSlug: string, practiceId: string, body: string) {
  const parsed = commentSchema.safeParse({ body })
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: "Not signed in" }

  const { data: practice } = await supabase
    .from("best_practices")
    .select("event_id")
    .eq("id", practiceId)
    .maybeSingle()
  if (!practice) return { success: false as const, error: "Not found" }

  const { data: me } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", practice.event_id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!me) return { success: false as const, error: "Complete onboarding first" }

  const { error } = await supabase
    .from("best_practice_comments")
    .insert({ best_practice_id: practiceId, author_id: me.id, body: parsed.data.body })

  if (error) return { success: false as const, error: error.message }
  revalidatePath(`/join/${eventSlug}/yibe/best-practices/${practiceId}`)
  return { success: true as const }
}
