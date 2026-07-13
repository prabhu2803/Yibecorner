// Single source of truth for onboarding form options and the matchmaking
// engine's tag vocabulary (features/matchmaking/engine.ts). Keeping these
// here means the form and the scoring algorithm can never drift apart.

export const DEFAULT_EVENT_SLUG = "yifi-2026"

export const INDUSTRIES = [
  "fintech",
  "healthtech",
  "edtech",
  "saas",
  "d2c",
  "ecommerce",
  "agritech",
  "climate_tech",
  "logistics",
  "manufacturing",
  "media",
  "real_estate",
  "banking",
  "other",
] as const

export type Industry = (typeof INDUSTRIES)[number]

// Industries considered "adjacent" for matchmaking's industry-relation
// bucket — pairs are unordered, checked both ways.
export const ADJACENT_INDUSTRIES: [Industry, Industry][] = [
  ["fintech", "banking"],
  ["edtech", "saas"],
  ["d2c", "ecommerce"],
  ["agritech", "climate_tech"],
  ["logistics", "manufacturing"],
]

export const BUSINESS_STAGES = [
  { value: "idea", label: "Idea stage" },
  { value: "early_stage", label: "Early stage" },
  { value: "growth", label: "Growth" },
  { value: "scaling", label: "Scaling" },
  { value: "established", label: "Established" },
] as const

export type BusinessStageValue = (typeof BUSINESS_STAGES)[number]["value"]

export const TAGS = [
  { value: "fundraising", label: "Fundraising" },
  { value: "mentorship", label: "Mentorship" },
  { value: "hiring", label: "Hiring & Team Building" },
  { value: "marketing", label: "Marketing & Growth" },
  { value: "product", label: "Product Strategy" },
  { value: "technology", label: "Technology & Engineering" },
  { value: "operations", label: "Operations & Supply Chain" },
  { value: "legal", label: "Legal & Compliance" },
  { value: "finance", label: "Finance & Accounting" },
  { value: "sales", label: "Sales & Partnerships" },
  { value: "branding", label: "Branding & Design" },
  { value: "international_expansion", label: "International Expansion" },
] as const

export type TagValue = (typeof TAGS)[number]["value"]

// Maps free-text "biggest challenge" keywords to the tag vocabulary above,
// used by the matchmaking engine's challenge-keyword-match bucket.
export const CHALLENGE_KEYWORD_TAGS: Record<TagValue, string[]> = {
  fundraising: ["fundrais", "raise", "investor", "vc", "seed", "series a", "capital", "funding"],
  mentorship: ["mentor", "guidance", "advice", "coach"],
  hiring: ["hire", "hiring", "recruit", "talent", "team building", "co-founder", "cofounder"],
  marketing: ["marketing", "growth", "acquisition", "seo", "ads", "brand awareness"],
  product: ["product", "roadmap", "feature", "pmf", "product-market fit"],
  technology: ["tech", "engineering", "architecture", "infrastructure", "ai", "software"],
  operations: ["operations", "supply chain", "logistics", "inventory", "fulfillment"],
  legal: ["legal", "compliance", "regulation", "contract", "ip", "patent"],
  finance: ["finance", "accounting", "cash flow", "runway", "budget", "unit economics"],
  sales: ["sales", "partnership", "b2b", "pipeline", "deals", "clients"],
  branding: ["branding", "design", "identity", "positioning"],
  international_expansion: ["international", "expansion", "overseas", "global", "export"],
}

export const BUSINESS_STAGE_ORDER: BusinessStageValue[] = [
  "idea",
  "early_stage",
  "growth",
  "scaling",
  "established",
]
