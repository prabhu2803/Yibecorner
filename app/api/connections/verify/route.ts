import { NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

// Resolves a scanned QR token (or manual fallback code) to the other
// participant's public identity — it no longer creates a connection by
// itself. Phase 2 of the networking rework requires an explicit "Send
// Connection Request" step (features/connections/actions.ts) after
// identifying who was scanned, whether that identification came from a QR
// scan, a manual code, or (in the future) an NFC tap — deliberately kept as
// a Route Handler rather than a Server Action so the same contract can be
// reused by that future NFC hardware (see design.md "Verified-connection
// flow"). All authorization is enforced by RLS via the cookie-bound server
// client, not by this handler.

const resolveSchema = z.object({
  eventSlug: z.string().min(1),
  scannedToken: z.string().min(1),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = resolveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
  const { eventSlug, scannedToken } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .maybeSingle()
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

  const { data: me } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!me) return NextResponse.json({ error: "Complete onboarding first" }, { status: 403 })

  // Accept either the full token or the 8-char manual fallback code.
  const normalized = scannedToken.trim().toLowerCase()
  const { data: candidates } = await supabase
    .from("event_participants")
    .select("id, personal_qr_token, full_name, company, designation, industry")
    .eq("event_id", event.id)

  const other = candidates?.find(
    (c) => c.personal_qr_token === normalized || c.personal_qr_token.startsWith(normalized)
  )
  if (!other) return NextResponse.json({ error: "QR code not recognized" }, { status: 404 })
  if (other.id === me.id) {
    return NextResponse.json({ error: "That's your own QR code" }, { status: 400 })
  }

  return NextResponse.json({
    participant: {
      id: other.id,
      fullName: other.full_name,
      company: other.company,
      designation: other.designation,
      industry: other.industry,
    },
  })
}

const patchSchema = z.object({
  connectionId: z.string().uuid(),
  action: z.enum(["accept", "decline"]),
})

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
  const { connectionId, action } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const nextStatus = action === "accept" ? "accepted" : "declined"

  // RLS (connections_update_recipient_or_admin) already guarantees only the
  // request's recipient can reach this row; the WHERE status='pending' AND
  // expires_at > now() makes a duplicate accept/decline affect 0 rows
  // instead of erroring, and column grants mean only `status` can ever
  // change here.
  const { data: updated, error } = await supabase
    .from("connections")
    .update({ status: nextStatus })
    .eq("id", connectionId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .select("id, status")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated) {
    return NextResponse.json(
      { error: "Already handled or expired" },
      { status: 409 }
    )
  }

  return NextResponse.json({ connectionId: updated.id, status: updated.status })
}
