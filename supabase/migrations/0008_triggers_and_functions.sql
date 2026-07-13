-- Shared helper: every "reaction" the TV shows goes through this one
-- function so the activity_type/vibi_state contract stays centralized.
create or replace function public.write_screen_activity(
  p_event_id uuid,
  p_activity_type text,
  p_payload jsonb,
  p_vibi_state text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.screen_activity_queue (event_id, activity_type, payload, vibi_state)
  values (p_event_id, p_activity_type, p_payload, p_vibi_state);
end;
$$;

-- Whenever a new event is created, give it matching settings + stats rows
-- so every downstream query/subscription can assume they exist.
create or replace function public.handle_new_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.event_settings (event_id) values (new.id);
  insert into public.event_stats (event_id) values (new.id);
  return new;
end;
$$;

create trigger on_event_created
  after insert on public.events
  for each row execute function public.handle_new_event();

-- Participant joins -> bump counter, wave on the TV
create or replace function public.handle_participant_joined()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_show_names boolean;
  v_payload jsonb;
begin
  update public.event_stats
    set entrepreneurs_joined = entrepreneurs_joined + 1, updated_at = now()
    where event_id = new.event_id;

  select show_participant_names into v_show_names
    from public.event_settings where event_id = new.event_id;

  v_payload := case when coalesce(v_show_names, true)
    then jsonb_build_object('participant_name', new.full_name)
    else '{}'::jsonb
  end;

  perform public.write_screen_activity(new.event_id, 'participant_joined', v_payload, 'wave');
  return new;
end;
$$;

create trigger on_participant_joined
  after insert on public.event_participants
  for each row execute function public.handle_participant_joined();

-- Connection verified -> bump counters + contribution scores, heart on the TV
create or replace function public.handle_connection_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_show_names boolean;
  v_requester_name text;
  v_recipient_name text;
  v_payload jsonb;
begin
  if new.status = 'verified' and old.status is distinct from 'verified' then
    update public.event_stats
      set verified_connections = verified_connections + 1, updated_at = now()
      where event_id = new.event_id;

    update public.event_participants
      set contribution_score = contribution_score + 5
      where id in (new.requester_id, new.recipient_id);

    select show_participant_names into v_show_names
      from public.event_settings where event_id = new.event_id;

    if coalesce(v_show_names, true) then
      select full_name into v_requester_name from public.event_participants where id = new.requester_id;
      select full_name into v_recipient_name from public.event_participants where id = new.recipient_id;
      v_payload := jsonb_build_object('a_name', v_requester_name, 'b_name', v_recipient_name);
    else
      v_payload := '{}'::jsonb;
    end if;

    perform public.write_screen_activity(new.event_id, 'connection_verified', v_payload, 'heart');
  end if;
  return new;
end;
$$;

create trigger on_connection_verified
  after update on public.connections
  for each row execute function public.handle_connection_verified();

-- Challenge posted -> bump counter, thinking on the TV
create or replace function public.handle_challenge_posted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.event_stats
    set challenges_posted = challenges_posted + 1, updated_at = now()
    where event_id = new.event_id;

  perform public.write_screen_activity(
    new.event_id, 'challenge_posted', jsonb_build_object('title', new.title), 'thinking'
  );
  return new;
end;
$$;

create trigger on_challenge_posted
  after insert on public.challenges
  for each row execute function public.handle_challenge_posted();

-- Challenge solved -> bump counter + contribution scores, celebrate on the TV
create or replace function public.handle_challenge_solved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_responder_id uuid;
begin
  if new.status = 'solved' and old.status is distinct from 'solved' then
    update public.event_stats
      set problems_solved = problems_solved + 1, updated_at = now()
      where event_id = new.event_id;

    update public.event_participants
      set contribution_score = contribution_score + 5
      where id = new.author_id;

    if new.solved_by_response_id is not null then
      select author_id into v_responder_id
        from public.challenge_responses where id = new.solved_by_response_id;

      if v_responder_id is not null then
        update public.event_participants
          set contribution_score = contribution_score + 10
          where id = v_responder_id;
      end if;
    end if;

    perform public.write_screen_activity(
      new.event_id, 'challenge_solved', jsonb_build_object('title', new.title), 'celebrate'
    );
  end if;
  return new;
end;
$$;

create trigger on_challenge_solved
  after update on public.challenges
  for each row execute function public.handle_challenge_solved();

-- Best practice shared -> bump counter, celebrate on the TV
create or replace function public.handle_best_practice_shared()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.event_stats
    set best_practices_shared = best_practices_shared + 1, updated_at = now()
    where event_id = new.event_id;

  update public.event_participants
    set contribution_score = contribution_score + 5
    where id = new.author_id;

  perform public.write_screen_activity(
    new.event_id, 'best_practice_shared', jsonb_build_object('title', new.title), 'celebrate'
  );
  return new;
end;
$$;

create trigger on_best_practice_shared
  after insert on public.best_practices
  for each row execute function public.handle_best_practice_shared();

-- Discussion created -> bump the "active discussions" counter (no TV reaction)
create or replace function public.handle_discussion_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.event_stats
    set discussions_active = discussions_active + 1, updated_at = now()
    where event_id = new.event_id;
  return new;
end;
$$;

create trigger on_discussion_created
  after insert on public.discussions
  for each row execute function public.handle_discussion_created();

-- Discussion membership changes -> keep participant_count in sync, and
-- celebrate on the TV when a discussion crosses a size milestone.
create or replace function public.handle_discussion_membership_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_discussion_id uuid;
  v_new_count int;
  v_event_id uuid;
  v_topic text;
begin
  v_discussion_id := coalesce(new.discussion_id, old.discussion_id);

  update public.discussions
    set participant_count = participant_count + (case when tg_op = 'INSERT' then 1 else -1 end)
    where id = v_discussion_id
    returning participant_count, event_id, topic into v_new_count, v_event_id, v_topic;

  if tg_op = 'INSERT' and v_new_count in (5, 10) then
    perform public.write_screen_activity(
      v_event_id,
      'discussion_milestone',
      jsonb_build_object('topic', v_topic, 'member_count', v_new_count),
      'celebrate'
    );
  end if;

  return coalesce(new, old);
end;
$$;

create trigger on_discussion_membership_changed
  after insert or delete on public.discussion_members
  for each row execute function public.handle_discussion_membership_changed();

-- toggle_upvote / toggle_save: the only sanctioned way to change
-- best_practices vote/save counts (columns are not directly client-writable).
create or replace function public.toggle_upvote(p_best_practice_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_participant_id uuid;
  v_removed boolean := false;
begin
  select event_id into v_event_id from public.best_practices where id = p_best_practice_id;
  v_participant_id := public.current_participant_id(v_event_id);

  if v_participant_id is null then
    raise exception 'no participant in this event for the current user';
  end if;

  delete from public.best_practice_upvotes
    where best_practice_id = p_best_practice_id and participant_id = v_participant_id;
  get diagnostics v_removed = row_count;

  if v_removed then
    update public.best_practices set upvote_count = greatest(upvote_count - 1, 0)
      where id = p_best_practice_id;
    return false;
  else
    insert into public.best_practice_upvotes (best_practice_id, participant_id)
      values (p_best_practice_id, v_participant_id);
    update public.best_practices set upvote_count = upvote_count + 1
      where id = p_best_practice_id;
    return true;
  end if;
end;
$$;

create or replace function public.toggle_save(p_best_practice_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_participant_id uuid;
  v_removed boolean := false;
begin
  select event_id into v_event_id from public.best_practices where id = p_best_practice_id;
  v_participant_id := public.current_participant_id(v_event_id);

  if v_participant_id is null then
    raise exception 'no participant in this event for the current user';
  end if;

  delete from public.best_practice_saves
    where best_practice_id = p_best_practice_id and participant_id = v_participant_id;
  get diagnostics v_removed = row_count;

  if v_removed then
    update public.best_practices set save_count = greatest(save_count - 1, 0)
      where id = p_best_practice_id;
    return false;
  else
    insert into public.best_practice_saves (best_practice_id, participant_id)
      values (p_best_practice_id, v_participant_id);
    update public.best_practices set save_count = save_count + 1
      where id = p_best_practice_id;
    return true;
  end if;
end;
$$;

-- Sweeps stale pending connections. Not scheduled automatically (pg_cron
-- availability varies by plan) — the verify Route Handler also lazily
-- rejects expired confirms. Schedule with pg_cron if available:
--   select cron.schedule('expire-connections', '*/5 * * * *',
--     $$select public.expire_stale_connections()$$);
create or replace function public.expire_stale_connections()
returns void
language sql
security definer
set search_path = public
as $$
  update public.connections
    set status = 'expired'
    where status = 'pending' and expires_at < now();
$$;

grant execute on function public.toggle_upvote(uuid) to authenticated;
grant execute on function public.toggle_save(uuid) to authenticated;
