import { createClient } from "@/lib/supabase/server"

export interface PublicChallenge {
  id: string
  title: string
  description: string
  category: string | null
  status: "open" | "solved" | "closed"
  responseCount: number
  authorName: string
  createdAt: string
}

export interface PublicConnection {
  id: string
  requesterName: string
  recipientName: string
  verifiedAt: string | null
}

export interface PublicParticipant {
  id: string
  fullName: string
  company: string | null
  designation: string | null
  city: string | null
  industry: string
  businessStage: string
  lookingFor: string[]
  canHelpWith: string[]
  joinedAt: string
}

/**
 * Runs with zero Supabase session (the landing page never bootstraps an
 * anonymous session) — safe because `challenges` already has an
 * anon-readable RLS policy with no sensitive columns
 * (0007_rls_policies.sql). Author names come from
 * `event_participants_public` (0027_public_board_view.sql), never the
 * raw `event_participants` table, so this can never accidentally select
 * personal_qr_token/user_id.
 */
export async function getPublicChallenges(eventId: string): Promise<PublicChallenge[]> {
  const supabase = await createClient()

  const { data: challenges } = await supabase
    .from("challenges")
    .select(
      "id, title, description, category, status, created_at, author_id, challenge_responses!challenge_responses_challenge_id_fkey(count)"
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })

  if (!challenges?.length) return []

  const authorIds = Array.from(new Set(challenges.map((c) => c.author_id)))
  const { data: authors } = await supabase
    .from("event_participants_public")
    .select("id, full_name")
    .in("id", authorIds)
  const nameById = new Map((authors ?? []).map((a) => [a.id, a.full_name]))

  return challenges.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    status: c.status,
    responseCount: c.challenge_responses?.[0]?.count ?? 0,
    authorName: nameById.get(c.author_id) ?? "Someone",
    createdAt: c.created_at,
  }))
}

/**
 * Reads from `connections_public` (0028_public_connections_view.sql) —
 * a deliberate, narrow public exposure of only ACCEPTED (verified)
 * connection pairs, never pending/declined/expired requests and never
 * the private `message` column. See that migration's comment for the
 * privacy reasoning.
 */
export async function getPublicConnections(eventId: string): Promise<PublicConnection[]> {
  const supabase = await createClient()

  const { data: connections } = await supabase
    .from("connections_public")
    .select("*")
    .eq("event_id", eventId)
    .order("verified_at", { ascending: false })

  if (!connections?.length) return []

  const participantIds = Array.from(
    new Set(connections.flatMap((c) => [c.requester_id, c.recipient_id]))
  )
  const { data: participants } = await supabase
    .from("event_participants_public")
    .select("id, full_name")
    .in("id", participantIds)
  const nameById = new Map((participants ?? []).map((p) => [p.id, p.full_name]))

  return connections.map((c) => ({
    id: c.id,
    requesterName: nameById.get(c.requester_id) ?? "Someone",
    recipientName: nameById.get(c.recipient_id) ?? "Someone",
    verifiedAt: c.verified_at,
  }))
}

export async function getPublicParticipants(eventId: string): Promise<PublicParticipant[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("event_participants_public")
    .select("*")
    .eq("event_id", eventId)
    .order("joined_at", { ascending: false })

  return (data ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    company: p.company,
    designation: p.designation,
    city: p.city,
    industry: p.industry,
    businessStage: p.business_stage,
    lookingFor: p.looking_for,
    canHelpWith: p.can_help_with,
    joinedAt: p.joined_at,
  }))
}
