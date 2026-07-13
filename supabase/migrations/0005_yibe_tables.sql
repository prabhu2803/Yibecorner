-- challenges + responses
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  author_id uuid not null references public.event_participants(id) on delete cascade,
  title text not null,
  description text not null,
  category text,
  status text not null default 'open' check (status in ('open', 'solved', 'closed')),
  solved_by_response_id uuid,
  is_flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index challenges_event_idx on public.challenges (event_id, status);

create table public.challenge_responses (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  author_id uuid not null references public.event_participants(id) on delete cascade,
  body text not null,
  is_introduction_offer boolean not null default false,
  is_flagged boolean not null default false,
  created_at timestamptz not null default now()
);
create index challenge_responses_challenge_idx on public.challenge_responses (challenge_id);

alter table public.challenges
  add constraint challenges_solved_by_fkey
  foreign key (solved_by_response_id) references public.challenge_responses(id) on delete set null;

-- best_practices + upvotes/saves/comments join tables
create table public.best_practices (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  author_id uuid not null references public.event_participants(id) on delete cascade,
  title text not null,
  body text not null,
  category text,
  upvote_count int not null default 0,
  save_count int not null default 0,
  is_flagged boolean not null default false,
  created_at timestamptz not null default now()
);
create index best_practices_event_idx on public.best_practices (event_id, upvote_count desc);

create table public.best_practice_upvotes (
  best_practice_id uuid references public.best_practices(id) on delete cascade,
  participant_id uuid references public.event_participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (best_practice_id, participant_id)
);

create table public.best_practice_saves (
  best_practice_id uuid references public.best_practices(id) on delete cascade,
  participant_id uuid references public.event_participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (best_practice_id, participant_id)
);

create table public.best_practice_comments (
  id uuid primary key default gen_random_uuid(),
  best_practice_id uuid not null references public.best_practices(id) on delete cascade,
  author_id uuid not null references public.event_participants(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index best_practice_comments_practice_idx on public.best_practice_comments (best_practice_id);

-- discussions + members
create table public.discussions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  created_by uuid not null references public.event_participants(id) on delete cascade,
  topic text not null,
  description text,
  industry text,
  participant_count int not null default 0,
  status text not null default 'open' check (status in ('open', 'converted', 'closed')),
  converted_to_circle_at timestamptz,
  circle_location text,
  created_at timestamptz not null default now()
);
create index discussions_event_idx on public.discussions (event_id, status);

create table public.discussion_members (
  discussion_id uuid references public.discussions(id) on delete cascade,
  participant_id uuid references public.event_participants(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (discussion_id, participant_id)
);
