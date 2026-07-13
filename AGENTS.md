<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Vibe Corner — Agent Conventions

Read `design.md` first for the full architecture. This file is the terse
"how to work in this repo" reference.

## Stack specifics that bite

- **Next.js 16 App Router.** `params` and `searchParams` are `Promise`s in
  both `page.tsx` and `layout.tsx` — always `await` them. Route gating lives
  in `proxy.ts` at the repo root (Next 16 renamed Middleware to Proxy; the
  file convention and `export function proxy(...)` name changed, behavior
  didn't).
- **`types/database.types.ts` is hand-authored**, not generated (no live
  Supabase project was available while scaffolding). Every table type
  declares `Relationships: []` and the schema declares `Views: Record<string,
  never>` — @supabase/postgrest-js's `GenericSchema`/`GenericTable`
  constraints require both keys, and omitting either silently collapses
  every query result type to `never` instead of erroring loudly. Regenerate
  the authoritative version once connected to a real project:
  `npm run db:types` (or `supabase gen types typescript --project-id <ref>`),
  and diff it against this file before trusting it.
- **Server Action form bindings**: `<form action={...}>` requires a function
  typed `(formData: FormData) => void | Promise<void>` — TypeScript's
  void-return leniency does **not** extend through `Promise<void>`, so an
  action returning `Promise<{success, error}>` fails to typecheck there even
  though it "should" work. The actions in `features/moderation/actions.ts`
  and `features/events-admin/actions.ts` are bound directly to forms, so they
  throw on failure and return nothing, rather than returning a result object.
  Actions invoked from client code via `await someAction(...)` (onboarding,
  challenges, best practices, discussions, matchmaking) keep the
  `{success, error}` shape since that's a normal function call, not a form
  action prop.
- **`lib/env.ts` parses env vars at module load time.** Any file that
  imports it (directly or transitively) will throw immediately if
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` aren't set —
  this includes `proxy.ts`, which runs on every request. Keep `.env.local`
  populated (placeholder values are fine for `next build`/typecheck; real
  values are required for anything that actually calls Supabase).

## Where things live

- `features/<domain>/` — business logic per domain (actions, engines, the
  domain's own client components). `actions.ts` files marked `"use server"`
  are Server Actions callable from client code; files marked `"server-only"`
  (no `"use server"`) are plain server-side helpers, not RPC endpoints.
- `components/ui/` — shadcn/ui primitives, generated via `npx shadcn add
  <component>`. Don't hand-edit unless necessary; `components/ui/form.tsx`
  is hand-written (the installed shadcn "radix-nova" preset's registry has
  no template for it) — treat it as a primitive, not a feature file.
- `components/shared/` — cross-feature UI (AuroraBackground, GlassCard,
  ParticleField, LiveCounter, QrFrame, MobileNav, EventSwitcher).
  `components/tv/` — TV-screen-only UI (HeroIntro, LiveLanding,
  TvExperience).
- `lib/supabase/{client,server,admin}.ts` — three different Supabase clients
  with three different trust levels. `admin.ts` (service role) bypasses RLS
  entirely and is `import "server-only"`-guarded; only import it from
  Server Actions that have already called `assertAdmin()`
  (`lib/admin-guard.ts`), or from `scripts/seed.ts`.
- `supabase/migrations/*.sql` — ordered, numbered. Read the comments at the
  top of `0007_rls_policies.sql` and `0008_triggers_and_functions.sql`
  before adding a table or changing a policy; the column-grant pattern used
  there (narrow `authenticated` grants + service-role-only moderation
  fields) is deliberate and should be matched for any new table.

## Conventions to keep

- Every mutation server-side re-validates with Zod, even though the client
  form also validates — never trust `FormData`/JSON bodies.
- Every admin Server Action calls `assertAdmin()` first, even on pages
  already gated by `proxy.ts` — Server Actions are independently reachable
  via direct POST.
- New realtime subscriptions should go through `lib/realtime/channels.ts`'s
  name builders, and should target the smallest table that has what's
  needed (prefer `event_stats`/`screen_activity_queue` over subscribing to
  raw business tables — see design.md's "Realtime channel design").
- Vibi's call-site API is exactly `<VibiMascot state="..." />`
  (`features/vibi/VibiMascot.tsx`). Never branch on asset availability at
  the call site — that logic lives in `features/vibi/asset-registry.ts` and
  the component's own fallback renderer.
