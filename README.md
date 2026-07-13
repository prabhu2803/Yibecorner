# Vibe Corner

AI-powered networking and business collaboration platform for
entrepreneurship events (built for YiFi — Young Indians Future Innovators).
Three surfaces: a TV/LED screen experience, a mobile participant journey
after a QR scan, and an admin dashboard. See `design.md` for the
architecture and the reasoning behind it, and `AGENTS.md` for repo
conventions if you're an agent picking this up.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui ·
Framer Motion · GSAP (TV intro only) · Supabase (Postgres + Auth + Realtime)
· Zod · React Hook Form · Zustand · Recharts.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then in
**Project Settings → API**, copy the project URL and anon key into
`.env.local` (copy `.env.example` as a starting point):

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # Project Settings -> API -> service_role — keep secret
```

**Enable Anonymous Sign-Ins**: Dashboard → Authentication → Sign In / Up →
turn on **Anonymous Sign-Ins**. Participants sign in anonymously on their
first `/join` visit (no login screen); this is off by default and the app
won't let anyone past onboarding without it.

### 3. Run the migrations

With the [Supabase CLI](https://supabase.com/docs/guides/cli) linked to your
project:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Or paste the contents of `supabase/migrations/*.sql` into the Dashboard's
SQL Editor, in numeric order (0001 → 0009).

This also enables Realtime on the 9 tables that need it — see
`0009_realtime_publication.sql`.

### 4. Seed the demo event

```bash
npm run seed
```

Idempotent — creates (or re-seeds) the `yifi-2026` demo event: a live
event, an admin account, ~26 participants (a few "hero" accounts with
strong match stories), challenges, best practices, discussions (one
already converted to a physical circle), and a mix of verified/pending
connections. Prints the admin login at the end
(`admin@vibecorner.local` / `VibeCorner!2026`).

### 5. Run it

```bash
npm run dev
```

- TV screen: `/screen/yifi-2026`
- Join as a participant: `/join/yifi-2026`
- Admin dashboard: `/admin/login`

## Assets

Real Vibi mascot animations, the hero intro video, and the Straw Labs/YiFi
logos aren't included yet. The app runs fully functional placeholders in
their place (see `design.md`'s Vibi section) — drop real files in at these
paths and everything picks them up automatically, no code changes:

```
public/videos/vibe-corner-hero-intro.mp4
public/vibi/{idle,wave,heart,celebrate,thinking,sleeping,wake,look-at-qr}.webm
public/logos/{straw-labs,yifi}.svg
```

## Project structure

```
app/            routes: /screen, /join, /admin, /api
features/       business logic per domain (actions, engines, domain UI)
components/ui   shadcn/ui primitives
components/     shared (Aurora/GlassCard/...) and TV-only UI
lib/            Supabase clients, env, constants, realtime channel names
hooks/          shared React hooks (realtime counters, screen commands)
types/          hand-authored Database types (see AGENTS.md before trusting)
supabase/       migrations (numbered, ordered) + config
scripts/seed.ts demo data for the yifi-2026 event
```

## Useful scripts

```bash
npm run dev        # start the dev server
npm run build      # production build
npm run lint       # eslint
npm run seed       # (re)seed the yifi-2026 demo event
npm run db:types   # regenerate types/database.types.ts from a live project
```
