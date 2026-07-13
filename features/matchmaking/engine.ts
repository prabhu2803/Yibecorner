import { ADJACENT_INDUSTRIES, CHALLENGE_KEYWORD_TAGS, type TagValue } from "@/lib/constants"
import type { BusinessStage } from "@/types/database.types"

export interface ParticipantProfile {
  id: string
  fullName: string
  industry: string
  businessStage: BusinessStage
  lookingFor: string[]
  canHelpWith: string[]
  biggestChallenge: string | null
}

export interface MatchResult {
  score: number
  breakdown: Record<string, number>
  reasons: string[]
  conversationStarter: string
}

// Static compatibility matrix for the business-stage-complementarity bucket.
// Mentor/mentee pairings (idea <-> scaling/established) and same-stage peer
// pairings both score well; adjacent stages score in between.
const STAGE_SCORES: Record<string, number> = {
  "idea|idea": 8,
  "idea|early_stage": 10,
  "idea|growth": 9,
  "idea|scaling": 13,
  "idea|established": 15,
  "early_stage|early_stage": 12,
  "early_stage|growth": 9,
  "early_stage|scaling": 9,
  "early_stage|established": 9,
  "growth|growth": 15,
  "growth|scaling": 12,
  "growth|established": 10,
  "scaling|scaling": 13,
  "scaling|established": 12,
  "established|established": 10,
}

function stageScore(a: BusinessStage, b: BusinessStage): number {
  const key = [a, b].sort().join("|")
  return STAGE_SCORES[key] ?? 8
}

function industryScore(a: string, b: string): number {
  if (a === b) return 15
  const isAdjacent = ADJACENT_INDUSTRIES.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a)
  )
  return isAdjacent ? 10 : 5
}

function overlap(a: string[], b: string[]): number {
  const setB = new Set(b)
  return a.filter((tag) => setB.has(tag)).length
}

function tagOverlapScore(a: ParticipantProfile, b: ParticipantProfile): number {
  const maxPossible = Math.max(a.lookingFor.length, 1) + Math.max(b.lookingFor.length, 1)
  const aWantsBHas = overlap(a.lookingFor, b.canHelpWith)
  const bWantsAHas = overlap(b.lookingFor, a.canHelpWith)
  const raw = aWantsBHas + bWantsAHas
  return Math.min(40, Math.round((raw / maxPossible) * 40))
}

function challengeKeywordScore(a: ParticipantProfile, b: ParticipantProfile): number {
  if (!a.biggestChallenge) return 0
  const text = a.biggestChallenge.toLowerCase()
  const matchedTags = (Object.keys(CHALLENGE_KEYWORD_TAGS) as TagValue[]).filter((tag) =>
    CHALLENGE_KEYWORD_TAGS[tag].some((keyword) => text.includes(keyword))
  )
  if (matchedTags.length === 0) return 0
  const hits = matchedTags.filter((tag) => b.canHelpWith.includes(tag)).length
  return Math.min(20, Math.round((hits / matchedTags.length) * 20))
}

const STARTER_TEMPLATES: Record<string, (a: ParticipantProfile, b: ParticipantProfile, tags: string[]) => string> = {
  tags: (a, b, tags) =>
    `You're looking for ${tags[0]?.replace(/_/g, " ")} and ${b.fullName} can help with exactly that.`,
  challenge: (a, b, tags) =>
    `${b.fullName} might have advice on "${a.biggestChallenge}" — they can help with ${tags[0]?.replace(/_/g, " ")}.`,
  industry: (a) => `You're both in ${a.industry.replace(/_/g, " ")} — great chance to compare notes.`,
  stage: (a, b) => `${a.fullName} (${a.businessStage.replace(/_/g, " ")}) and ${b.fullName} (${b.businessStage.replace(/_/g, " ")}) make a natural mentor/peer pairing.`,
}

export function scoreMatch(a: ParticipantProfile, b: ParticipantProfile): MatchResult {
  const tagsScore = tagOverlapScore(a, b)
  const challengeScore = challengeKeywordScore(a, b)
  const industry = industryScore(a.industry, b.industry)
  const stage = stageScore(a.businessStage, b.businessStage)

  const aWantsBHas = overlap(a.lookingFor, b.canHelpWith) > 0
  const bWantsAHas = overlap(b.lookingFor, a.canHelpWith) > 0
  const mutualBonus = aWantsBHas && bWantsAHas ? 10 : 0

  const score = tagsScore + challengeScore + industry + stage + mutualBonus

  const matchedHelpTags = a.lookingFor.filter((tag) => b.canHelpWith.includes(tag))
  const reasons: string[] = []
  let conversationStarter: string

  if (matchedHelpTags.length > 0) {
    reasons.push(`${b.fullName} can help with ${matchedHelpTags.join(", ").replace(/_/g, " ")}`)
    conversationStarter = STARTER_TEMPLATES.tags(a, b, matchedHelpTags)
  } else if (challengeScore > 0) {
    reasons.push(`${b.fullName} may have relevant experience with your biggest challenge`)
    conversationStarter = STARTER_TEMPLATES.challenge(a, b, b.canHelpWith)
  } else if (industry === 15) {
    reasons.push(`Same industry: ${a.industry.replace(/_/g, " ")}`)
    conversationStarter = STARTER_TEMPLATES.industry(a, b, [])
  } else {
    reasons.push(`Complementary business stages: ${a.businessStage} + ${b.businessStage}`)
    conversationStarter = STARTER_TEMPLATES.stage(a, b, [])
  }

  if (mutualBonus > 0) {
    reasons.push("You can help each other — a two-way match")
  }

  return {
    score: Math.min(100, score),
    breakdown: { tagsScore, challengeScore, industry, stage, mutualBonus },
    reasons,
    conversationStarter,
  }
}
