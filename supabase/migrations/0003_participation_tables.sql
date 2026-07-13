-- event_participants: one row per (event, user) — the participant profile
create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  company text,
  industry text not null,
  business_stage text not null check (
    business_stage in ('idea', 'early_stage', 'growth', 'scaling', 'established')
  ),
  looking_for text[] not null default '{}',
  can_help_with text[] not null default '{}',
  biggest_challenge text,
  personal_qr_token uuid not null default gen_random_uuid() unique,
  contribution_score int not null default 0,
  onboarding_completed_at timestamptz,
  joined_at timestamptz not null default now(),
  is_visible boolean not null default true,
  unique (event_id, user_id)
);
create index event_participants_event_idx on public.event_participants (event_id);
create index event_participants_qr_token_idx on public.event_participants (personal_qr_token);

-- matches: precomputed deterministic-matchmaking suggestions
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.event_participants(id) on delete cascade,
  matched_participant_id uuid not null references public.event_participants(id) on delete cascade,
  score numeric(5, 2) not null,
  score_breakdown jsonb not null default '{}'::jsonb,
  reasons text[] not null default '{}',
  conversation_starter text,
  status text not null default 'suggested' check (
    status in ('suggested', 'viewed', 'connect_requested', 'dismissed')
  ),
  created_at timestamptz not null default now(),
  unique (participant_id, matched_participant_id),
  check (participant_id <> matched_participant_id)
);
create index matches_participant_idx on public.matches (participant_id, score desc);

-- connections: verified QR (or future NFC) handshakes between participants
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  requester_id uuid not null references public.event_participants(id) on delete cascade,
  recipient_id uuid not null references public.event_participants(id) on delete cascade,
  status text not null default 'pending' check (
    status in ('pending', 'verified', 'rejected', 'expired')
  ),
  initiated_via text not null default 'qr' check (initiated_via in ('qr', 'nfc', 'manual')),
  scanned_at timestamptz not null default now(),
  verified_at timestamptz,
  expires_at timestamptz not null default (now() + interval '2 minutes'),
  unique (event_id, requester_id, recipient_id),
  check (requester_id <> recipient_id)
);
create index connections_recipient_idx on public.connections (recipient_id, status);
create index connections_requester_idx on public.connections (requester_id, status);
