-- screen_commands: admin -> TV commands (replay intro, show/hide QR, etc.)
create table public.screen_commands (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  command_type text not null check (
    command_type in (
      'replay_intro',
      'show_qr',
      'hide_qr',
      'trigger_celebration',
      'trigger_announcement',
      'toggle_participant_names',
      'emergency_static_mode'
    )
  ),
  payload jsonb not null default '{}'::jsonb,
  issued_by uuid references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'delivered', 'acknowledged')),
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index screen_commands_event_idx on public.screen_commands (event_id, created_at desc);

-- screen_activity_queue: trigger-populated "reactions" feed the TV listens to.
-- No client (anon or authenticated) ever gets an insert policy on this table —
-- only SECURITY DEFINER triggers write here (see 0007).
create table public.screen_activity_queue (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  activity_type text not null check (
    activity_type in (
      'participant_joined',
      'connection_verified',
      'challenge_posted',
      'challenge_solved',
      'best_practice_shared',
      'discussion_milestone',
      'announcement'
    )
  ),
  payload jsonb not null default '{}'::jsonb,
  vibi_state text check (
    vibi_state in ('idle', 'wave', 'heart', 'celebrate', 'thinking', 'sleeping', 'wake', 'look_at_qr')
  ),
  created_at timestamptz not null default now()
);
create index screen_activity_queue_event_idx on public.screen_activity_queue (event_id, created_at desc);

-- analytics_events: write-only tracking log
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid references public.event_participants(id) on delete set null,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index analytics_events_event_idx on public.analytics_events (event_id, event_name, created_at);
