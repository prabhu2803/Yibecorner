# Vibe Corner — Architecture

AI-powered networking platform for entrepreneurship events (e.g. YiFi). Three
surfaces share one Supabase backend:

- **TV screen** (`/screen/[eventSlug]`) — fullscreen kiosk display for a
  large LED screen. Hero intro, then a permanent live layout: mascot +
  wordmark up top, QR + live counters pinned to the bottom.
- **Participant app** (`/join/[eventSlug]`) — mobile-first journey after a
  QR scan: onboarding, AI matchmaking, verified connections, and "YIBE
  Corner" (challenges / best practices / discussions).
- **Admin dashboard** (`/admin`) — event stats, live screen control,
  moderation, and analytics.

This document explains *why* the system is built the way it is. For
"how do I work in this repo," see `AGENTS.md`.

## Foundational decisions

**Anonymous auth for participants.** Onboarding needs to be under two
minutes with no login screen, but every write still needs to be
attributable and RLS-enforceable. Supabase Anonymous Sign-In solves this:
the participant gets a real `auth.uid()` the moment they land on `/join`,
before they've typed anything, so RLS policies work exactly like they would
for a normal authenticated user. The tradeoff: clearing site data / a new
device means a new identity — acceptable for a single-session event app,
called out in the README's setup section (`enable_anonymous_sign_ins` must
also be turned on in the hosted Supabase project's Auth settings — it's off
by default and easy to forget).

**Admins are real Supabase Auth users**, flagged via
`app_metadata.role = 'admin'` set at account-creation time (never by a
client). `proxy.ts` reads the role straight out of the JWT to gate
`/admin/*`, and every admin Server Action independently re-checks via
`assertAdmin()` (`lib/admin-guard.ts`) — render-time gating alone is not a
security boundary, since Server Actions are reachable by direct POST.

**Two Supabase clients, two trust levels.** `lib/supabase/server.ts` (cookie-
bound, respects RLS) is used for everything a signed-in participant or admin
does themselves. `lib/supabase/admin.ts` (service role, bypasses RLS
entirely, `import "server-only"`-guarded) is used only for: (a) the
matchmaking engine writing `matches` rows (no client has insert rights on
that table by design), (b) admin moderation fields that are deliberately
excluded from participant column grants (`is_visible`, `is_flagged`,
`circle_location`/discussion `status`), and (c) `scripts/seed.ts`.

**Realtime fan-out is structurally bounded**, not just "subscribe less."
`event_stats` is a single denormalized row per event, updated only by
triggers — the TV and admin dashboard subscribe to *one row's* UPDATE
events instead of aggregating six+ raw tables client-side.
`screen_activity_queue` is the *only* thing the TV listens to for
"reactions" (participant joined, connection verified, challenge solved,
etc.) — it has no client INSERT policy at all, populated exclusively by
`SECURITY DEFINER` triggers, so the TV never has to reason about which raw
table changed. The realtime publication (`0009_realtime_publication.sql`)
deliberately excludes `event_participants`, `matches`, and
`analytics_events` — nothing subscribes to them, so they don't pay the
fan-out cost.

## Database

13 core tables + 3 best-practice join tables, in
`supabase/migrations/0001`–`0009` (see file headers for what each does).
Two things worth knowing that aren't obvious from the table names alone:

- **`event_stats` and `event_settings`** aren't in the original product
  spec's table list — they were added because the realtime design above
  needs them. `handle_new_event()` (a trigger on `events` insert) creates
  both automatically, so every event always has them from creation.
- **Moderation/system fields are locked out at the column-grant level, not
  just RLS.** E.g. `event_participants.contribution_score` has an RLS policy
  that would otherwise let a participant update their own row, but
  `revoke update ... from authenticated; grant update (full_name, company,
  ...) to authenticated` (in `0007_rls_policies.sql`) means the column
  simply isn't in the grant list — no application bug can accidentally
  expose a write path to it. The same pattern locks `best_practices.
  upvote_count`/`save_count` (only `toggle_upvote`/`toggle_save` RPCs can
  change them), `challenges.is_flagged`, `discussions.status`/
  `circle_location`, and `screen_commands` (no INSERT grant for any client
  role at all — issuing a command is exclusively a service-role operation,
  see `features/screen-control/actions.ts`).

This was verified end-to-end against a throwaway local Postgres instance
during development (stub `auth.users`/`auth.uid()`, real migrations applied
in order): event creation auto-creates settings/stats, participant joins
increment counters and write activity rows, connections verifying bumps
contribution scores atomically, challenge/best-practice triggers fire
correctly, `toggle_upvote` is idempotent, discussion membership crossing 5/10
fires a milestone activity row, and — the important negative test — an
authenticated participant's direct attempt to write `contribution_score`
is rejected by Postgres at the privilege level, not just silently ignored.

## Realtime channel map

| Client | Channel | Listens to |
|---|---|---|
| TV | `screen:{eventId}` | `screen_commands` INSERT, `screen_activity_queue` INSERT |
| TV | `stats:{eventId}` | `event_stats` UPDATE |
| Participant | `connections:{participantId}` | `connections` INSERT/UPDATE (recipient + requester filtered) |
| Participant | `challenge:{id}` / `best-practice:{id}` / `discussion:{id}` | page-scoped, only while viewing that detail page |
| Admin | `stats:{eventId}`, `admin-moderation:{eventId}`, `admin-connections:{eventId}`, `screen:{eventId}` | dashboard cards, raw moderation feed, command ack status |

On mount, the TV does one bounded historical fetch — pending
`screen_commands` + the last 5 `screen_activity_queue` rows — and never a
full replay, so a refreshed browser resumes in a sane state instead of
re-firing every celebration that ever happened at the event.

## Vibi (the mascot)

`features/vibi/asset-registry.ts` maps each of 8 states (`idle`, `wave`,
`heart`, `celebrate`, `thinking`, `sleeping`, `wake`, `look_at_qr`) to an
asset descriptor. Every registry entry currently points at
`kind: "placeholder"` and a not-yet-present file path under `public/vibi/`
— **no real animation assets exist yet**. `<VibiMascot state="..." />`
(the entire call-site API, used in ~10 places) tries to render that file
and falls back to a Framer Motion "breathing gradient orb" placeholder
(tinted per-state, with a matching Lucide icon) on load error. Dropping in
real `.webm`/video files at the registry's paths — or swapping the `kind`
field to `"rive"`/`"lottie"` and adding one branch to the renderer — changes
Vibi everywhere with zero other code touched.

State transitions live in a small zustand store
(`features/vibi/useVibiState.ts`): `setState` for direct control, `react`
for realtime-driven reactions that auto-return to `idle` after the
duration configured per-state in the registry.

## Matchmaking

Deterministic, not ML — `features/matchmaking/engine.ts`. 100-point score:
tag overlap between `looking_for`/`can_help_with` (40, bidirectional),
challenge-keyword-to-tag match via a static dictionary (20,
`lib/constants.ts`'s `CHALLENGE_KEYWORD_TAGS`), industry relation via a
static adjacency list (15), business-stage complementarity via a static
matrix (15), +10 if both sides benefit. "Why relevant" and the conversation
starter are template strings selected by whichever bucket scored highest —
no free text generation, fully deterministic and explainable.

Computed server-side (`features/matchmaking/actions.ts`,
`computeMatchesForParticipant`) right after onboarding completes, using the
service-role client (matches has no client insert policy — the scoring
engine is the only writer). Swapping in a real AI-reasoning provider later
means changing what happens inside that function's loop; `MatchCard.tsx`
and the `matches` query it reads from don't change.

## Verified connections

QR owner (A) shows `/join/[slug]/profile/qr` (encodes a URL containing
their `personal_qr_token`, plus an 8-character manual fallback code for bad
lighting/Wi-Fi). Scanner (B) hits `/join/[slug]/connections/scan` →
`POST /api/connections/verify`. This is a **Route Handler**, not a Server
Action, specifically so the same contract can be reused by future NFC
hardware — only `method` (`qr`/`nfc`/`manual`) would differ.

- If a reverse pending row already exists (both people scanned each other),
  the second scan *is* the confirmation — no extra tap needed.
- Otherwise, an upsert on the `(event_id, requester_id, recipient_id)`
  unique constraint makes a duplicate scan idempotent, and the QR owner
  gets a realtime push to confirm/reject via `PATCH /api/connections/verify`.
- The confirm handler does a conditional `UPDATE ... WHERE status='pending'
  AND expires_at > now()`, so a duplicate confirm affects 0 rows instead of
  erroring, and only the actual recipient (the person physically present
  and scanned) can ever confirm — RLS enforces this, not the handler.
- A trigger on `status → 'verified'` atomically bumps `event_stats`,
  both participants' `contribution_score`, and writes the activity-queue
  row that makes the TV react with `heart`.

Both endpoints run through the **cookie-bound** server client, not the
service-role client — RLS is the actual authorization mechanism here, the
Route Handler is just the transport.

## Admin

`middleware.ts` doesn't exist in Next 16 — the equivalent file is
`proxy.ts` at the repo root (see `AGENTS.md`). It gates `/admin/*` (except
`/admin/login`) behind `app_metadata.role === 'admin'`. The dashboard
resolves "which event" from a `?event=slug` query param
(`lib/queries/events.ts`'s `resolveAdminEvent`, defaulting to whichever
event has `status = 'live'`), since Next.js layouts can't read
`searchParams` — only individual pages can, so each admin page resolves it
independently rather than sharing a single layout-level lookup.

Screen Control issues all 7 commands
(`replay_intro`/`show_qr`/`hide_qr`/`trigger_celebration`/
`trigger_announcement`/`toggle_participant_names`/`emergency_static_mode`)
by inserting into `screen_commands` via the service-role client — there is
no INSERT policy for any other role on that table. Moderation actions
(hide a participant, flag content, convert a discussion to a physical
circle) work the same way, via `features/moderation/actions.ts`.

## Known simplifications (documented, not accidental)

- Field-level moderation within a single form submission (e.g. "author can
  edit title/body but not is_flagged in the same request") relies on the
  column-grant mechanism described above as the actual enforcement — Server
  Action code doesn't re-derive it, since the database already refuses the
  write.
- `features/analytics/track.ts` (client-side fire-and-forget analytics
  helper) exists and is wired into onboarding completion
  (`onboarding_completed`) but not yet retrofitted into every other action
  (qr_scanned, match_viewed, etc.) — the call site pattern is established,
  extending coverage is additive.
- `types/database.types.ts` is hand-authored, not generated (see
  `AGENTS.md` for the specific `GenericSchema` gotcha this ran into).
  Regenerate it against a real project with `npm run db:types` once one
  exists, and diff before trusting.
- No real Vibi/hero-video/logo assets exist yet — see the Vibi section
  above. The app is fully functional today on placeholders.
