"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const requestSchema = z.object({
  recipientParticipantId: z.string().uuid(),
  message: z.string().trim().max(280).optional().or(z.literal("")),
  initiatedVia: z.enum(["qr", "manual", "match"]).default("match"),
})

/**
 * Creates a connection request — the recipient must explicitly accept or
 * decline it (see PATCH /api/connections/verify) before either side is
 * "connected". Used both from a match card's Connect button (no scan
 * needed) and from ScanFlow after a QR/manual code resolves to a person.
 */
export async function sendConnectionRequest(
  eventSlug: string,
  eventId: string,
  input: z.infer<typeof requestSchema>
) {
  const parsed = requestSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const { recipientParticipantId, message, initiatedVia } = parsed.data

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

  if (me.id === recipientParticipantId) {
    return { success: false as const, error: "You can't connect with yourself" }
  }

  const { data: connection, error } = await supabase
    .from("connections")
    .upsert(
      {
        event_id: eventId,
        requester_id: me.id,
        recipient_id: recipientParticipantId,
        initiated_via: initiatedVia,
        message: message || null,
        status: "pending",
        scanned_at: new Date().toISOString(),
      },
      { onConflict: "event_id,requester_id,recipient_id" }
    )
    .select("id, status")
    .single()

  if (error || !connection) {
    return { success: false as const, error: error?.message ?? "Could not send request" }
  }

  try {
    await supabase.from("analytics_events").insert({
      event_id: eventId,
      participant_id: me.id,
      event_name: "connection_request_sent",
      metadata: { recipient_id: recipientParticipantId, initiated_via: initiatedVia },
    })
  } catch (err) {
    console.error("connection_request_sent analytics insert failed:", err)
  }

  revalidatePath(`/join/${eventSlug}/connections`)
  return { success: true as const, connectionId: connection.id, status: connection.status }
}
