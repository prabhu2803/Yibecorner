/**
 * Seeds (or re-seeds) the "yifi-2026" demo event with a full, story-tellable
 * dataset: hero accounts with strong match stories, challenges/responses,
 * best practices with votes/comments, discussions (including one already
 * converted to a physical circle), and a mix of verified/pending
 * connections. Idempotent: deletes any existing "yifi-2026" event first
 * (cascades to every child table) and reuses/creates auth users by email,
 * so it's safe to re-run.
 *
 * Deliberately relies on the DB triggers in
 * supabase/migrations/0008_triggers_and_functions.sql to populate
 * event_stats and screen_activity_queue — every insert below is exactly
 * the kind of write those triggers already react to in production, so the
 * TV/admin dashboards are populated for free, with no separate bookkeeping
 * here.
 *
 * Run with: npm run seed   (requires .env.local with SUPABASE_SERVICE_ROLE_KEY)
 */
import { createClient } from "@supabase/supabase-js"

import { scoreMatch, type ParticipantProfile } from "../features/matchmaking/engine"
import type { Database } from "../types/database.types"

const EVENT_SLUG = "yifi-2026"
const SEED_PASSWORD = "VibeCorner!2026"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.local)."
  )
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function pickMany<T>(arr: readonly T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

const INDUSTRIES = [
  "fintech",
  "healthtech",
  "edtech",
  "saas",
  "d2c",
  "ecommerce",
  "agritech",
  "logistics",
] as const
const STAGES = ["idea", "early_stage", "growth", "scaling", "established"] as const
const TAGS = [
  "fundraising",
  "mentorship",
  "hiring",
  "marketing",
  "product",
  "technology",
  "operations",
  "legal",
  "finance",
  "sales",
  "branding",
  "international_expansion",
] as const
const FIRST_NAMES = [
  "Asha",
  "Vikram",
  "Priya",
  "Rohan",
  "Neha",
  "Arjun",
  "Kavya",
  "Aditya",
  "Meera",
  "Karthik",
  "Ishaan",
  "Diya",
  "Sanjay",
  "Ananya",
  "Rahul",
  "Pooja",
  "Varun",
  "Riya",
  "Nikhil",
  "Sneha",
]
const LAST_NAMES = [
  "Rao",
  "Shah",
  "Sharma",
  "Menon",
  "Gupta",
  "Iyer",
  "Nair",
  "Reddy",
  "Kapoor",
  "Verma",
]
const COMPANIES = [
  "Northwind Labs",
  "Bluepeak",
  "Cobalt Works",
  "Fernway",
  "Solstice",
  "Amberlane",
  "Ridgeline",
  "Lumen Studio",
  "Harborlight",
  "Greywolf",
]

async function ensureUser(email: string, appMetadata: Record<string, unknown> = {}) {
  const { data: existing } = await supabase.auth.admin.listUsers({ perPage: 200 })
  const found = existing?.users.find((u) => u.email === email)
  if (found) return found.id

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
    app_metadata: appMetadata,
  })
  if (error || !data.user) throw error ?? new Error(`Could not create user ${email}`)
  return data.user.id
}

async function main() {
  console.log(`Seeding "${EVENT_SLUG}"...`)

  const { data: existingEvent } = await supabase
    .from("events")
    .select("id")
    .eq("slug", EVENT_SLUG)
    .maybeSingle()
  if (existingEvent) {
    await supabase.from("events").delete().eq("id", existingEvent.id)
    console.log("Removed previous event data (cascaded to all child tables).")
  }

  const adminUserId = await ensureUser("admin@vibecorner.local", { role: "admin" })
  console.log(`Admin user ready: admin@vibecorner.local / ${SEED_PASSWORD}`)

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      slug: EVENT_SLUG,
      name: "YiFi 2026",
      description: "Young Indians Future Innovators — annual entrepreneurship summit.",
      status: "live",
      created_by: adminUserId,
    })
    .select("*")
    .single()
  if (eventError || !event) throw eventError

  // Hero accounts: deliberately complementary so the matchmaking demo tells
  // a clear story (fundraising founder <-> mentor with fundraising help,
  // same-industry peers, etc).
  const heroSpecs = [
    {
      fullName: "Priya Sharma",
      company: "Northwind Labs",
      industry: "fintech",
      businessStage: "idea",
      lookingFor: ["fundraising", "mentorship"],
      canHelpWith: ["technology"],
      biggestChallenge: "Struggling to raise a seed round from VCs and angel investors",
    },
    {
      fullName: "Vikram Shah",
      company: "Bluepeak Capital",
      industry: "fintech",
      businessStage: "established",
      lookingFor: ["hiring"],
      canHelpWith: ["fundraising", "mentorship"],
      biggestChallenge: "Looking to hire a strong VP of Engineering",
    },
    {
      fullName: "Ananya Iyer",
      company: "Cobalt Works",
      industry: "d2c",
      businessStage: "growth",
      lookingFor: ["marketing", "branding"],
      canHelpWith: ["operations", "sales"],
      biggestChallenge: "Customer acquisition cost is too high, need better marketing strategy",
    },
    {
      fullName: "Rohan Mehta",
      company: "Fernway Studio",
      industry: "d2c",
      businessStage: "scaling",
      lookingFor: ["operations"],
      canHelpWith: ["marketing", "branding"],
      biggestChallenge: "Supply chain and fulfillment operations breaking down at scale",
    },
  ] as const

  const fillerCount = 22
  const fillerSpecs = Array.from({ length: fillerCount }, (_, i) => {
    const lookingFor = pickMany(TAGS, 1 + Math.floor(Math.random() * 2))
    const canHelpWith = pickMany(TAGS, 1 + Math.floor(Math.random() * 2))
    return {
      fullName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${i}`,
      company: pick(COMPANIES),
      industry: pick(INDUSTRIES),
      businessStage: pick(STAGES),
      lookingFor,
      canHelpWith,
      biggestChallenge: null as string | null,
    }
  })

  const allSpecs = [...heroSpecs, ...fillerSpecs]
  const participants: Database["public"]["Tables"]["event_participants"]["Row"][] = []

  for (let i = 0; i < allSpecs.length; i++) {
    const spec = allSpecs[i]
    const email = `seed+${i}@vibecorner.local`
    const userId = await ensureUser(email)

    const { data: participant, error } = await supabase
      .from("event_participants")
      .insert({
        event_id: event.id,
        user_id: userId,
        full_name: spec.fullName,
        company: spec.company,
        industry: spec.industry,
        business_stage: spec.businessStage,
        looking_for: [...spec.lookingFor],
        can_help_with: [...spec.canHelpWith],
        biggest_challenge: spec.biggestChallenge,
        onboarding_completed_at: new Date().toISOString(),
      })
      .select("*")
      .single()
    if (error || !participant) throw error

    participants.push(participant)
  }
  console.log(`Created ${participants.length} participants (${heroSpecs.length} hero accounts).`)

  // Precompute matches for the hero accounts so /matches isn't empty on
  // first load for the demo.
  function toProfile(p: (typeof participants)[number]): ParticipantProfile {
    return {
      id: p.id,
      fullName: p.full_name,
      industry: p.industry,
      businessStage: p.business_stage,
      lookingFor: p.looking_for,
      canHelpWith: p.can_help_with,
      biggestChallenge: p.biggest_challenge,
    }
  }

  for (const hero of participants.slice(0, heroSpecs.length)) {
    const heroProfile = toProfile(hero)
    const results = participants
      .filter((p) => p.id !== hero.id)
      .map((other) => ({ other, result: scoreMatch(heroProfile, toProfile(other)) }))
      .sort((a, b) => b.result.score - a.result.score)
      .slice(0, 10)

    await supabase.from("matches").insert(
      results.map(({ other, result }) => ({
        event_id: event.id,
        participant_id: hero.id,
        matched_participant_id: other.id,
        score: result.score,
        score_breakdown: result.breakdown,
        reasons: result.reasons,
        conversation_starter: result.conversationStarter,
      }))
    )
  }
  console.log("Computed matches for hero accounts.")

  // Challenges + responses (1-2 marked solved).
  const challengeSpecs = [
    { title: "How do I raise a seed round with no traction yet?", solved: true },
    { title: "Best way to find a technical co-founder?", solved: true },
    { title: "How to reduce customer acquisition cost for a D2C brand?", solved: false },
    { title: "Hiring a VP of Engineering — where do I even start?", solved: false },
    { title: "Supply chain keeps breaking down as we scale", solved: false },
    { title: "How to price an enterprise SaaS product?", solved: false },
    { title: "Legal structure for an agritech startup operating across states", solved: false },
    { title: "How to negotiate better payment terms with distributors?", solved: false },
  ]

  for (const spec of challengeSpecs) {
    const author = pick(participants)
    const { data: challenge } = await supabase
      .from("challenges")
      .insert({
        event_id: event.id,
        author_id: author.id,
        title: spec.title,
        description: `${author.full_name} is looking for advice: ${spec.title}`,
      })
      .select("*")
      .single()
    if (!challenge) continue

    const responders = pickMany(
      participants.filter((p) => p.id !== author.id),
      2
    )
    const responseIds: string[] = []
    for (const responder of responders) {
      const { data: response } = await supabase
        .from("challenge_responses")
        .insert({
          challenge_id: challenge.id,
          author_id: responder.id,
          body: `From my experience, I'd suggest focusing on the fundamentals first. Happy to talk more — ${responder.full_name}.`,
          is_introduction_offer: Math.random() > 0.6,
        })
        .select("id")
        .single()
      if (response) responseIds.push(response.id)
    }

    if (spec.solved && responseIds.length > 0) {
      await supabase
        .from("challenges")
        .update({ status: "solved", solved_by_response_id: responseIds[0] })
        .eq("id", challenge.id)
    }
  }
  console.log(`Created ${challengeSpecs.length} challenges with responses.`)

  // Best practices + upvotes/saves/comments.
  const practiceSpecs = [
    "Always negotiate term sheets in writing, never over email",
    "Hire slow, fire fast — one bad hire costs more than an empty seat",
    "Talk to 50 customers before writing a line of product code",
    "Build your cap table with a lawyer from day one, not a template",
    "Set up unit economics tracking before you scale spend",
    "Weekly investor updates build trust even in the down months",
    "Document your onboarding — it's your best hiring lever",
    "Test pricing before you test the product",
  ]

  for (const title of practiceSpecs) {
    const author = pick(participants)
    const { data: practice } = await supabase
      .from("best_practices")
      .insert({
        event_id: event.id,
        author_id: author.id,
        title,
        body: `${title}. Learned this the hard way at ${author.company ?? "our company"} — happy to share more details.`,
      })
      .select("*")
      .single()
    if (!practice) continue

    const upvoters = pickMany(participants, 3 + Math.floor(Math.random() * 8))
    await supabase
      .from("best_practice_upvotes")
      .insert(upvoters.map((p) => ({ best_practice_id: practice.id, participant_id: p.id })))

    const savers = pickMany(participants, 2 + Math.floor(Math.random() * 5))
    await supabase
      .from("best_practice_saves")
      .insert(savers.map((p) => ({ best_practice_id: practice.id, participant_id: p.id })))

    await supabase
      .from("best_practices")
      .update({ upvote_count: upvoters.length, save_count: savers.length })
      .eq("id", practice.id)

    const commenters = pickMany(participants, 2)
    await supabase.from("best_practice_comments").insert(
      commenters.map((p) => ({
        best_practice_id: practice.id,
        author_id: p.id,
        body: "This is great advice, wish I'd known this earlier!",
      }))
    )
  }
  console.log(`Created ${practiceSpecs.length} best practices with votes/comments.`)

  // Discussions (one converted to a physical circle).
  const discussionSpecs = [
    { topic: "D2C go-to-market strategies", industry: "d2c", convert: true },
    { topic: "Raising in a tough fundraising climate", industry: "fintech", convert: false },
    { topic: "Building AI features into existing SaaS products", industry: "saas", convert: false },
    { topic: "Agritech supply chain innovations", industry: "agritech", convert: false },
  ]

  for (const spec of discussionSpecs) {
    const creator = pick(participants)
    const { data: discussion } = await supabase
      .from("discussions")
      .insert({
        event_id: event.id,
        created_by: creator.id,
        topic: spec.topic,
        industry: spec.industry,
        description: `Open discussion on ${spec.topic.toLowerCase()}.`,
      })
      .select("*")
      .single()
    if (!discussion) continue

    await supabase
      .from("discussion_members")
      .insert({ discussion_id: discussion.id, participant_id: creator.id })

    const members = pickMany(
      participants.filter((p) => p.id !== creator.id),
      spec.convert ? 9 : 3 + Math.floor(Math.random() * 4)
    )
    for (const member of members) {
      await supabase
        .from("discussion_members")
        .insert({ discussion_id: discussion.id, participant_id: member.id })
    }

    if (spec.convert) {
      await supabase
        .from("discussions")
        .update({
          status: "converted",
          circle_location: "Table 4, near the main entrance",
          converted_to_circle_at: new Date().toISOString(),
        })
        .eq("id", discussion.id)
    }
  }
  console.log(`Created ${discussionSpecs.length} discussions.`)

  // Connections: mostly verified, a few left pending.
  const connectionPairs = pickMany(
    participants.flatMap((a, i) =>
      participants.slice(i + 1).map((b) => [a, b] as const)
    ),
    13
  )

  for (let i = 0; i < connectionPairs.length; i++) {
    const [a, b] = connectionPairs[i]
    const { data: connection } = await supabase
      .from("connections")
      .insert({
        event_id: event.id,
        requester_id: a.id,
        recipient_id: b.id,
        initiated_via: "qr",
      })
      .select("id")
      .single()
    if (!connection) continue

    if (i < connectionPairs.length - 3) {
      await supabase.from("connections").update({ status: "verified" }).eq("id", connection.id)
    }
  }
  console.log(`Created ${connectionPairs.length} connections (${connectionPairs.length - 3} verified).`)

  console.log("\nSeed complete.")
  console.log(`Event: /screen/${EVENT_SLUG} and /join/${EVENT_SLUG}`)
  console.log(`Admin login: admin@vibecorner.local / ${SEED_PASSWORD}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
