import "server-only"

import { GoogleGenAI, Type } from "@google/genai"

import { serverEnv } from "@/lib/env"
import type { ParticipantProfile } from "@/features/matchmaking/engine"

const MODEL = "gemini-flash-latest"

export interface AiCandidateProfile extends ParticipantProfile {
  company: string | null
  designation: string | null
  city: string | null
  challengeCategory: string | null
  futureSelfAspiration: string | null
}

export interface AiMatchResult {
  score: number
  reasons: string[]
  conversationStarter: string
}

function describe(p: AiCandidateProfile): string {
  const lines = [
    `id: ${p.id}`,
    `name: ${p.fullName}`,
    p.designation ? `role: ${p.designation}${p.company ? ` at ${p.company}` : ""}` : null,
    `industry: ${p.industry.replace(/_/g, " ")}`,
    `business stage: ${p.businessStage.replace(/_/g, " ")}`,
    p.city ? `city: ${p.city}` : null,
    `looking for: ${p.lookingFor.map((t) => t.replace(/_/g, " ")).join(", ") || "none stated"}`,
    `can help with: ${p.canHelpWith.map((t) => t.replace(/_/g, " ")).join(", ") || "none stated"}`,
    p.biggestChallenge ? `biggest challenge (their words): "${p.biggestChallenge}"` : null,
    p.challengeCategory ? `challenge category: ${p.challengeCategory.replace(/_/g, " ")}` : null,
    p.futureSelfAspiration ? `future goal: "${p.futureSelfAspiration}"` : null,
  ].filter(Boolean)
  return lines.join("\n")
}

/**
 * Re-ranks a heuristic-prefiltered candidate pool with an LLM call so
 * "customers" (or any of the flat matchmaking tags) gets judged against
 * what the two people actually said they need/offer/struggle with,
 * instead of scoring purely on literal tag-overlap (see engine.ts).
 * `candidates` should already be capped (~20) by the caller — this sends
 * every candidate profile in one prompt, not one call per pair.
 *
 * Returns null on any failure (no key, network, unparseable output) so
 * the caller can fall back to the deterministic engine — matchmaking
 * must never block or break onboarding, same philosophy as
 * generateFutureSelfImage.
 */
export async function rerankMatchesWithAI(
  self: AiCandidateProfile,
  candidates: AiCandidateProfile[]
): Promise<Map<string, AiMatchResult> | null> {
  if (!serverEnv.GEMINI_API_KEY || candidates.length === 0) return null

  try {
    const ai = new GoogleGenAI({ apiKey: serverEnv.GEMINI_API_KEY })

    const prompt = `You are matchmaking founders/entrepreneurs at a networking event. Judge relevance based on what each person actually needs and offers in their own words — not just whether a category label overlaps. For example, someone needing "customers" for a B2B fintech SaaS is a poor match with someone who can offer "customers" for a D2C skincare brand, even though the tag is identical; look at industry, stated challenge, and goals together to judge real fit.

PERSON TO MATCH:
${describe(self)}

CANDIDATES (choose and rank up to 10 of the best matches for the person above, best first):
${candidates.map((c) => `---\n${describe(c)}`).join("\n")}

For each candidate you select, return their exact id, a score 0-100 reflecting genuine relevance to what the person above stated they need/offer/struggle with, 1-3 short concrete reasons referencing specifics from both profiles (not generic category names), and a natural one-sentence conversation starter the person could use to open a chat with that candidate. Omit candidates with no real relevance rather than padding the list.`

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  reasons: { type: Type.ARRAY, items: { type: Type.STRING } },
                  conversationStarter: { type: Type.STRING },
                },
                required: ["id", "score", "reasons", "conversationStarter"],
              },
            },
          },
          required: ["matches"],
        },
      },
    })

    const text = response.text
    if (!text) return null

    const parsed = JSON.parse(text) as {
      matches?: { id: string; score: number; reasons: string[]; conversationStarter: string }[]
    }
    const candidateIds = new Set(candidates.map((c) => c.id))
    const result = new Map<string, AiMatchResult>()

    for (const m of parsed.matches ?? []) {
      if (!candidateIds.has(m.id) || result.has(m.id)) continue
      if (typeof m.score !== "number" || !Array.isArray(m.reasons) || !m.conversationStarter) continue
      result.set(m.id, {
        score: Math.max(0, Math.min(100, m.score)),
        reasons: m.reasons.slice(0, 3),
        conversationStarter: m.conversationStarter,
      })
    }

    return result.size > 0 ? result : null
  } catch (err) {
    console.error("rerankMatchesWithAI failed:", err)
    return null
  }
}
