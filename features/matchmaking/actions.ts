import "server-only"

import { scoreMatch, type ParticipantProfile } from "@/features/matchmaking/engine"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database.types"

type ParticipantRow = Database["public"]["Tables"]["event_participants"]["Row"]

function toProfile(row: ParticipantRow): ParticipantProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    industry: row.industry,
    businessStage: row.business_stage,
    lookingFor: row.looking_for,
    canHelpWith: row.can_help_with,
    biggestChallenge: row.biggest_challenge,
  }
}

/**
 * Runs the deterministic scoring engine for one participant against every
 * other participant in the event and persists the top 10 as `matches` rows.
 * Uses the service-role client because `matches` has no client insert
 * policy (see supabase/migrations/0007_rls_policies.sql) — this always
 * runs server-side, right after onboarding completes.
 *
 * Swapping in real AI reasoning later means changing what happens inside
 * this function's loop (e.g. calling an LLM instead of `scoreMatch`)
 * without touching MatchCard.tsx or the `matches` query it's read from.
 */
export async function computeMatchesForParticipant(eventId: string, participantId: string) {
  const supabase = createAdminClient()

  const { data: participants, error } = await supabase
    .from("event_participants")
    .select("*")
    .eq("event_id", eventId)
    .eq("is_visible", true)

  if (error) throw error
  if (!participants) return

  const self = participants.find((p) => p.id === participantId)
  if (!self) return

  const selfProfile = toProfile(self)
  const results = participants
    .filter((p) => p.id !== participantId)
    .map((other) => {
      const otherProfile = toProfile(other)
      const result = scoreMatch(selfProfile, otherProfile)
      return { other, result }
    })
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, 10)

  await supabase.from("matches").delete().eq("participant_id", participantId)

  if (results.length === 0) return

  const rows = results.map(({ other, result }) => ({
    event_id: eventId,
    participant_id: participantId,
    matched_participant_id: other.id,
    score: result.score,
    score_breakdown: result.breakdown,
    reasons: result.reasons,
    conversation_starter: result.conversationStarter,
  }))

  await supabase.from("matches").insert(rows)
}
