-- Helper functions used throughout RLS policies (0007) and triggers (0008).
-- Both are SECURITY DEFINER so they can read tables the calling role
-- (anon/authenticated) does not otherwise have SELECT access to. Defined
-- here (after profiles/event_participants exist) because SQL-language
-- functions are validated against the schema at CREATE time.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Resolves the event_participants.id for the currently authenticated user
-- within a given event. Used everywhere an RLS policy needs to answer
-- "is this row mine?" without letting clients pass their own participant id.
create or replace function public.current_participant_id(p_event_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.event_participants
  where event_id = p_event_id and user_id = auth.uid()
  limit 1;
$$;
