// Single source of truth for onboarding form options and the matchmaking
// engine's tag vocabulary (features/matchmaking/engine.ts). Keeping these
// here means the form and the scoring algorithm can never drift apart.
//
// `TAGS` is intentionally one shared vocabulary for both "looking for" and
// "can help with" — the matchmaking engine scores literal tag-overlap
// between the two fields (see tagOverlapScore in engine.ts), which only
// works if both fields draw from the same label set. A separate
// resource-type list (Investors/Mentors/...) vs skill-type list
// (Sales/AI/...) would barely overlap and silently collapse that score.
//
// Choice-step icons are Material Symbols ligature names (e.g. "rocket_launch"),
// rendered via the <MaterialIcon> helper against the Material Symbols
// Outlined font loaded by the onboarding flow — matching the Cyber-Conclave
// reference design system glyph-for-glyph rather than lucide-react SVGs.

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

// Display metadata for the Industry carousel step. Kept separate from
// INDUSTRIES itself since that array must stay a plain string tuple for
// z.enum(INDUSTRIES) in the onboarding schema.
export const INDUSTRY_META: Record<Industry, { icon: string; label: string; description: string }> = {
  fintech: { icon: "account_balance_wallet", label: "Fintech", description: "Payments, lending, banking infrastructure." },
  healthtech: { icon: "health_and_safety", label: "Healthtech", description: "Healthcare, diagnostics, wellness." },
  edtech: { icon: "school", label: "Edtech", description: "Learning platforms and education tools." },
  saas: { icon: "cloud", label: "SaaS", description: "Software sold as a subscription service." },
  d2c: { icon: "shopping_bag", label: "D2C", description: "Brands selling directly to consumers." },
  ecommerce: { icon: "shopping_cart", label: "E-commerce", description: "Online marketplaces and retail." },
  agritech: { icon: "agriculture", label: "Agritech", description: "Farming, agriculture, food supply." },
  climate_tech: { icon: "eco", label: "Climate Tech", description: "Sustainability and clean energy." },
  logistics: { icon: "local_shipping", label: "Logistics", description: "Shipping, fulfillment, supply chain." },
  manufacturing: { icon: "precision_manufacturing", label: "Manufacturing", description: "Making physical products at scale." },
  media: { icon: "movie", label: "Media", description: "Content, entertainment, publishing." },
  real_estate: { icon: "home_work", label: "Real Estate", description: "Property, construction, PropTech." },
  banking: { icon: "account_balance", label: "Banking", description: "Traditional financial institutions." },
  other: { icon: "auto_awesome", label: "Other", description: "Something that doesn't fit neatly above." },
}

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
  { value: "idea", label: "Idea stage", icon: "lightbulb", description: "Still validating the concept." },
  { value: "early_stage", label: "Early stage", icon: "construction", description: "Building the first version." },
  { value: "growth", label: "Growth", icon: "trending_up", description: "Finding what scales, and doing more of it." },
  { value: "scaling", label: "Scaling", icon: "rocket_launch", description: "Scaling the team, product, and revenue." },
  { value: "established", label: "Established", icon: "account_balance", description: "A mature business, looking ahead." },
] as const

export type BusinessStageValue = (typeof BUSINESS_STAGES)[number]["value"]

export const TAGS = [
  { value: "customers", label: "Customers" },
  { value: "partners", label: "Partners" },
  { value: "investors", label: "Investors" },
  { value: "mentors", label: "Mentors" },
  { value: "suppliers", label: "Suppliers" },
  { value: "talent", label: "Talent" },
  { value: "co_founder", label: "Co-Founder" },
  { value: "distribution", label: "Distribution" },
  { value: "learning", label: "Learning" },
  { value: "fundraising", label: "Fundraising" },
  { value: "mentorship", label: "Mentorship" },
  { value: "hiring", label: "Hiring & Team Building" },
  { value: "marketing", label: "Marketing & Growth" },
  { value: "product", label: "Product Strategy" },
  { value: "technology", label: "Technology & AI" },
  { value: "operations", label: "Operations & Supply Chain" },
  { value: "legal", label: "Legal & Compliance" },
  { value: "finance", label: "Finance & Accounting" },
  { value: "sales", label: "Sales & Partnerships" },
  { value: "branding", label: "Branding & Design" },
  { value: "leadership", label: "Leadership" },
  { value: "international_expansion", label: "Export & International Expansion" },
] as const

export type TagValue = (typeof TAGS)[number]["value"]

// Maps free-text "biggest challenge" keywords to the tag vocabulary above,
// used by the matchmaking engine's challenge-keyword-match bucket.
export const CHALLENGE_KEYWORD_TAGS: Record<TagValue, string[]> = {
  customers: ["customer", "clients", "user acquisition", "demand"],
  partners: ["partner", "partnership", "alliance", "collab"],
  investors: ["investor", "vc", "seed", "series a", "capital", "funding"],
  mentors: ["mentor", "guidance", "advice", "coach"],
  suppliers: ["supplier", "vendor", "sourcing", "procurement"],
  talent: ["talent", "recruit", "hire", "hiring", "team building"],
  co_founder: ["co-founder", "cofounder", "co founder"],
  distribution: ["distribution", "distributor", "channel", "reseller"],
  learning: ["learn", "learning", "upskill", "training"],
  fundraising: ["fundrais", "raise", "investor", "vc", "seed", "series a", "capital", "funding"],
  mentorship: ["mentor", "guidance", "advice", "coach"],
  hiring: ["hire", "hiring", "recruit", "talent", "team building", "co-founder", "cofounder"],
  marketing: ["marketing", "growth", "acquisition", "seo", "ads", "brand awareness"],
  product: ["product", "roadmap", "feature", "pmf", "product-market fit"],
  technology: ["tech", "engineering", "architecture", "infrastructure", "ai", "software", "automation"],
  operations: ["operations", "supply chain", "logistics", "inventory", "fulfillment"],
  legal: ["legal", "compliance", "regulation", "contract", "ip", "patent"],
  finance: ["finance", "accounting", "cash flow", "runway", "budget", "unit economics"],
  sales: ["sales", "partnership", "b2b", "pipeline", "deals", "clients"],
  branding: ["branding", "design", "identity", "positioning"],
  leadership: ["leadership", "management", "culture", "org design"],
  international_expansion: ["international", "expansion", "overseas", "global", "export"],
}

export const BUSINESS_STAGE_ORDER: BusinessStageValue[] = [
  "idea",
  "early_stage",
  "growth",
  "scaling",
  "established",
]

export const CHALLENGE_CATEGORIES = [
  "sales",
  "marketing",
  "hiring",
  "technology",
  "manufacturing",
  "finance",
  "operations",
  "export",
  "leadership",
  "product",
] as const

export type ChallengeCategory = (typeof CHALLENGE_CATEGORIES)[number]

export const CHALLENGE_CATEGORY_META: Record<ChallengeCategory, { icon: string; label: string; description: string }> = {
  sales: { icon: "handshake", label: "Sales", description: "Finding and closing customers." },
  marketing: { icon: "campaign", label: "Marketing", description: "Getting the word out, building demand." },
  hiring: { icon: "person_add", label: "Hiring", description: "Finding the right people for your team." },
  technology: { icon: "memory", label: "Technology", description: "Building or automating with tech." },
  manufacturing: { icon: "precision_manufacturing", label: "Manufacturing", description: "Making your product at scale." },
  finance: { icon: "payments", label: "Finance", description: "Cash flow, runway, fundraising." },
  operations: { icon: "inventory_2", label: "Operations", description: "Supply chain, logistics, execution." },
  export: { icon: "public", label: "Export", description: "Selling beyond your home market." },
  leadership: { icon: "explore", label: "Leadership", description: "Culture, management, direction." },
  product: { icon: "extension", label: "Product", description: "What to build next, and why." },
}

export const FUTURE_SELF_ASPIRATIONS = [
  {
    value: "unicorn_founder",
    label: "Unicorn Founder",
    icon: "auto_awesome",
    description: "You built a company worth a billion dollars, from a single idea.",
  },
  {
    value: "ipo_celebration",
    label: "IPO Celebration",
    icon: "celebration",
    description: "You rang the opening bell the day your company went public.",
  },
  {
    value: "global_ceo",
    label: "Global CEO",
    icon: "public",
    description: "You lead a company with offices and customers on every continent.",
  },
  {
    value: "industry_leader",
    label: "Industry Leader",
    icon: "military_tech",
    description: "Others in your industry look to you for what comes next.",
  },
  {
    value: "ted_speaker",
    label: "TED Speaker",
    icon: "mic",
    description: "You stood on that red dot and told the world your story.",
  },
  {
    value: "ai_innovator",
    label: "AI Innovator",
    icon: "smart_toy",
    description: "You built something with AI that changed how people work.",
  },
  {
    value: "manufacturing_visionary",
    label: "Manufacturing Visionary",
    icon: "precision_manufacturing",
    description: "You modernized an entire industry, one factory at a time.",
  },
  {
    value: "social_impact_leader",
    label: "Social Impact Leader",
    icon: "volunteer_activism",
    description: "Your business made real lives better, not just a balance sheet.",
  },
  {
    value: "dream_office",
    label: "Dream Office",
    icon: "home_work",
    description: "You walk into the office you always pictured, and it's real.",
  },
] as const

export type FutureSelfAspiration = (typeof FUTURE_SELF_ASPIRATIONS)[number]["value"]
