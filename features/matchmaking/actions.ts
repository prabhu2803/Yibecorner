import "server-only"

import { rerankMatchesWithAI, type AiCandidateProfile } from "@/features/matchmaking/ai-rerank"
import { scoreMatch } from "@/features/matchmaking/engine"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database.types"

type ParticipantRow = Database["public"]["Tables"]["event_participants"]["Row"]

// How many of the top heuristic candidates get sent to the AI reranker —
// bounds prompt size to one LLM call per onboarding/edit, not one per pair.
const AI_CANDIDATE_POOL_SIZE = 20

function toProfile(row: ParticipantRow): AiCandidateProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    industry: row.industry,
    businessStage: row.business_stage,
    lookingFor: row.looking_for,
    canHelpWith: row.can_help_with,
    biggestChallenge: row.biggest_challenge,
    company: row.company,
    designation: row.designation,
    city: row.city,
    challengeCategory: row.challenge_category,
    futureSelfAspiration: row.future_self_aspiration,
  }
}

/**
 * Runs the deterministic scoring engine for one participant against every
 * other participant in the event as a cheap prefilter, then asks an LLM to
 * rerank the top candidates by actual relevance to what each person said
 * they need/offer (see ai-rerank.ts) — the heuristic engine alone can't
 * tell "customers" for a B2B fintech SaaS apart from "customers" for a D2C
 * brand, since both draw from the same flat tag vocabulary (lib/constants.ts).
 * Persists the top 10 as `matches` rows. Uses the service-role client
 * because `matches` has no client insert policy (see
 * supabase/migrations/0007_rls_policies.sql) — this always runs
 * server-side, right after onboarding completes or a profile edit saves.
 *
 * Falls back to the pure heuristic ranking whenever the AI call is
 * unavailable or fails (no GEMINI_API_KEY, network error, unparseable
 * output) — matchmaking must never block or break onboarding.
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
  const heuristicResults = participants
    .filter((p) => p.id !== participantId)
    .map((other) => {
      const otherProfile = toProfile(other)
      const result = scoreMatch(selfProfile, otherProfile)
      return { profile: otherProfile, result }
    })
    .sort((a, b) => b.result.score - a.result.score)

  const candidatePool = heuristicResults.slice(0, AI_CANDIDATE_POOL_SIZE)
  const aiResults = await rerankMatchesWithAI(
    selfProfile,
    candidatePool.map((c) => c.profile)
  )

  const finalResults = (aiResults
    ? Array.from(aiResults.entries())
        .map(([id, ai]) => {
          const heuristic = candidatePool.find((c) => c.profile.id === id)
          if (!heuristic) return null
          return {
            profile: heuristic.profile,
            score: ai.score,
            breakdown: { ...heuristic.result.breakdown, ai_reranked: 1 },
            reasons: ai.reasons,
            conversationStarter: ai.conversationStarter,
          }
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => b.score - a.score)
    : heuristicResults.map(({ profile, result }) => ({
        profile,
        score: result.score,
        breakdown: result.breakdown,
        reasons: result.reasons,
        conversationStarter: result.conversationStarter,
      }))
  ).slice(0, 10)

  await supabase.from("matches").delete().eq("participant_id", participantId)

  if (finalResults.length === 0) return

  const rows = finalResults.map((r) => ({
    event_id: eventId,
    participant_id: participantId,
    matched_participant_id: r.profile.id,
    score: r.score,
    score_breakdown: r.breakdown,
    reasons: r.reasons,
    conversation_starter: r.conversationStarter,
  }))

  await supabase.from("matches").insert(rows)
}
