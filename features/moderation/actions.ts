"use server"

import { revalidatePath } from "next/cache"

import { assertAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Every mutation here uses the service-role client on purpose: moderation
// fields (is_visible, is_flagged, circle_location/status) are deliberately
// excluded from the authenticated column grants in
// supabase/migrations/0007_rls_policies.sql, so only a verified admin
// Server Action can ever change them.
//
// These are bound directly to <form action={...}> in the admin tables, so
// they return void (Promise<void>) — a form action prop must return
// void|Promise<void> exactly, not a Promise<{success,error}> — and simply
// throw on failure, which Next.js surfaces via the nearest error boundary.

export async function setParticipantVisibility(path: string, participantId: string, visible: boolean) {
  await assertAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("event_participants")
    .update({ is_visible: visible })
    .eq("id", participantId)

  if (error) throw new Error(error.message)
  revalidatePath(path)
}

export async function setChallengeFlagged(path: string, challengeId: string, flagged: boolean) {
  await assertAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase.from("challenges").update({ is_flagged: flagged }).eq("id", challengeId)

  if (error) throw new Error(error.message)
  revalidatePath(path)
}

export async function setBestPracticeFlagged(path: string, practiceId: string, flagged: boolean) {
  await assertAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("best_practices")
    .update({ is_flagged: flagged })
    .eq("id", practiceId)

  if (error) throw new Error(error.message)
  revalidatePath(path)
}

export async function convertDiscussionToCircle(path: string, discussionId: string, formData: FormData) {
  await assertAdmin()
  const circleLocation = String(formData.get("circleLocation") ?? "").trim()
  if (!circleLocation) throw new Error("Location is required")

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("discussions")
    .update({
      status: "converted",
      circle_location: circleLocation,
      converted_to_circle_at: new Date().toISOString(),
    })
    .eq("id", discussionId)

  if (error) throw new Error(error.message)
  revalidatePath(path)
}
