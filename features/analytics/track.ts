"use client"

import { createClient } from "@/lib/supabase/client"
import type { Json } from "@/types/database.types"

/**
 * Fire-and-forget analytics tracking. analytics_events has a public INSERT
 * policy (write-only log — see supabase/migrations/0007_rls_policies.sql),
 * so this can be called from any client component without extra plumbing.
 */
export function track(
  eventId: string,
  eventName: string,
  metadata: Record<string, Json> = {},
  participantId?: string
) {
  const supabase = createClient()
  void supabase.from("analytics_events").insert({
    event_id: eventId,
    participant_id: participantId ?? null,
    event_name: eventName,
    metadata,
  })
}
