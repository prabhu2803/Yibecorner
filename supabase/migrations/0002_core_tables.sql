-- profiles: mirrors auth.users, flags admins
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- events: one row per event (e.g. "yifi-2026")
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'live', 'ended')),
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text not null default 'Asia/Kolkata',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_slug_idx on public.events (slug);

-- event_settings: one row per event, controls TV/screen behavior
create table public.event_settings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  show_qr boolean not null default true,
  show_participant_names boolean not null default true,
  emergency_static_mode boolean not null default false,
  intro_last_played_at timestamptz,
  theme jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- event_stats: denormalized single-row-per-event counters, updated only by
-- triggers (see 0007). This is what the TV/admin dashboards subscribe to
-- instead of every raw table, to keep realtime fan-out cheap.
create table public.event_stats (
  event_id uuid primary key references public.events(id) on delete cascade,
  entrepreneurs_joined int not null default 0,
  verified_connections int not null default 0,
  challenges_posted int not null default 0,
  problems_solved int not null default 0,
  best_practices_shared int not null default 0,
  discussions_active int not null default 0,
  updated_at timestamptz not null default now()
);

-- Auto-create a profiles row whenever a new auth.users row appears
-- (covers both anonymous participants and real admin accounts).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, is_admin)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_app_meta_data ->> 'role') = 'admin', false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
