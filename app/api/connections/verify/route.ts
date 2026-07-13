import { NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

// The single endpoint for turning a QR scan into a verified connection.
// Deliberately a Route Handler (not a Server Action) so the exact same
// contract can be reused by future NFC hardware — only `method` differs
// (see design.md "Verified-connection flow"). All authorization is
// enforced by RLS via the cookie-bound server client, not by this handler.

const postSchema = z.object({
  eventSlug: z.string().min(1),
  scannedToken: z.string().min(1),
  method: z.enum(["qr", "nfc", "manual"]).default("qr"),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
  const { eventSlug, scannedToken, method } = parsed.data

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
    .select("id, personal_qr_token")
    .eq("event_id", event.id)

  const other = candidates?.find(
    (c) => c.personal_qr_token === normalized || c.personal_qr_token.startsWith(normalized)
  )
  if (!other) return NextResponse.json({ error: "QR code not recognized" }, { status: 404 })
  if (other.id === me.id) {
    return NextResponse.json({ error: "That's your own QR code" }, { status: 400 })
  }

  // Mutual-scan shortcut: if the other person already scanned *us* and it's
  // still pending, this scan is itself the confirmation — no separate tap
  // needed.
  const { data: reverse } = await supabase
    .from("connections")
    .select("*")
    .eq("event_id", event.id)
    .eq("requester_id", other.id)
    .eq("recipient_id", me.id)
    .eq("status", "pending")
    .maybeSingle()

  if (reverse) {
    const { data: verified, error } = await supabase
      .from("connections")
      .update({ status: "verified" })
      .eq("id", reverse.id)
      .eq("status", "pending")
      .select("id, status")
      .maybeSingle()

    if (error || !verified) {
      return NextResponse.json({ error: "Could not verify connection" }, { status: 409 })
    }
    return NextResponse.json({ connectionId: verified.id, status: verified.status })
  }

  const { data: connection, error } = await supabase
    .from("connections")
    .upsert(
      {
        event_id: event.id,
        requester_id: me.id,
        recipient_id: other.id,
        initiated_via: method,
        scanned_at: new Date().toISOString(),
      },
      { onConflict: "event_id,requester_id,recipient_id" }
    )
    .select("id, status")
    .single()

  if (error || !connection) {
    return NextResponse.json({ error: error?.message ?? "Could not create connection" }, { status: 500 })
  }

  return NextResponse.json({ connectionId: connection.id, status: connection.status })
}

const patchSchema = z.object({
  connectionId: z.string().uuid(),
  action: z.enum(["confirm", "reject"]),
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

  const nextStatus = action === "confirm" ? "verified" : "rejected"

  // RLS (connections_update_recipient_or_admin) already guarantees only the
  // QR owner (recipient) can reach this row; the WHERE status='pending' AND
  // expires_at > now() makes a duplicate confirm affect 0 rows instead of
  // erroring, and column grants mean only `status` can ever change here.
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
      { error: "Already handled or expired — ask them to scan again" },
      { status: 409 }
    )
  }

  return NextResponse.json({ connectionId: updated.id, status: updated.status })
}
