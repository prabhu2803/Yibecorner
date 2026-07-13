-- Enable RLS everywhere. Tables with no matching policy below are
-- effectively locked to the anon/authenticated roles by default and are
-- only ever written to via SECURITY DEFINER triggers/RPCs (owned by the
-- migration role, which bypasses RLS) or the service-role client used by
-- trusted admin Server Actions.
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_settings enable row level security;
alter table public.event_stats enable row level security;
alter table public.event_participants enable row level security;
alter table public.matches enable row level security;
alter table public.connections enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_responses enable row level security;
alter table public.best_practices enable row level security;
alter table public.best_practice_upvotes enable row level security;
alter table public.best_practice_saves enable row level security;
alter table public.best_practice_comments enable row level security;
alter table public.discussions enable row level security;
alter table public.discussion_members enable row level security;
alter table public.screen_commands enable row level security;
alter table public.screen_activity_queue enable row level security;
alter table public.analytics_events enable row level security;

-- profiles
create policy "profiles_select_self_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_self_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- events: public read (TV/join are unauthenticated-friendly), admin write
create policy "events_select_public" on public.events
  for select to anon, authenticated using (true);
create policy "events_write_admin" on public.events
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- event_settings: public read, admin write
create policy "event_settings_select_public" on public.event_settings
  for select to anon, authenticated using (true);
create policy "event_settings_write_admin" on public.event_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- event_stats: public read only; all writes are trigger-driven
create policy "event_stats_select_public" on public.event_stats
  for select to anon, authenticated using (true);

-- event_participants: public read (discovery/matching), self insert/update
create policy "event_participants_select_public" on public.event_participants
  for select to anon, authenticated using (true);
create policy "event_participants_insert_self" on public.event_participants
  for insert to authenticated with check (user_id = auth.uid());
create policy "event_participants_update_self_or_admin" on public.event_participants
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
-- Participants may only ever change their own profile content; moderation
-- fields (is_visible), score, and the QR token are system/admin managed.
revoke update on public.event_participants from authenticated;
grant update (
  full_name, company, industry, business_stage, looking_for,
  can_help_with, biggest_challenge, onboarding_completed_at
) on public.event_participants to authenticated;

-- matches: read own suggestions, status is the only client-writable field
create policy "matches_select_self_or_admin" on public.matches
  for select to authenticated
  using (participant_id = public.current_participant_id(event_id) or public.is_admin());
create policy "matches_update_self" on public.matches
  for update to authenticated
  using (participant_id = public.current_participant_id(event_id))
  with check (participant_id = public.current_participant_id(event_id));
revoke update on public.matches from authenticated;
grant update (status) on public.matches to authenticated;

-- connections: requester creates, only the recipient (QR owner) confirms/rejects
create policy "connections_select_participants_or_admin" on public.connections
  for select to authenticated
  using (
    requester_id = public.current_participant_id(event_id)
    or recipient_id = public.current_participant_id(event_id)
    or public.is_admin()
  );
create policy "connections_insert_requester" on public.connections
  for insert to authenticated
  with check (requester_id = public.current_participant_id(event_id));
create policy "connections_update_recipient_or_admin" on public.connections
  for update to authenticated
  using (recipient_id = public.current_participant_id(event_id) or public.is_admin())
  with check (recipient_id = public.current_participant_id(event_id) or public.is_admin());
revoke update on public.connections from authenticated;
grant update (status) on public.connections to authenticated;

-- challenges
create policy "challenges_select_public" on public.challenges
  for select to anon, authenticated using (true);
create policy "challenges_insert_self" on public.challenges
  for insert to authenticated with check (author_id = public.current_participant_id(event_id));
create policy "challenges_update_author_or_admin" on public.challenges
  for update to authenticated
  using (author_id = public.current_participant_id(event_id) or public.is_admin())
  with check (author_id = public.current_participant_id(event_id) or public.is_admin());
-- Moderation (is_flagged) is handled exclusively through the service-role
-- admin client in trusted Server Actions, never via a client grant.
revoke update on public.challenges from authenticated;
grant update (title, description, category, status, solved_by_response_id)
  on public.challenges to authenticated;

-- challenge_responses
create policy "challenge_responses_select_public" on public.challenge_responses
  for select to anon, authenticated using (true);
create policy "challenge_responses_insert_self" on public.challenge_responses
  for insert to authenticated with check (author_id = public.current_participant_id(
    (select event_id from public.challenges where id = challenge_id)
  ));
create policy "challenge_responses_update_author_or_admin" on public.challenge_responses
  for update to authenticated
  using (author_id = public.current_participant_id(
    (select event_id from public.challenges where id = challenge_id)
  ) or public.is_admin())
  with check (true);
create policy "challenge_responses_delete_author_or_admin" on public.challenge_responses
  for delete to authenticated
  using (author_id = public.current_participant_id(
    (select event_id from public.challenges where id = challenge_id)
  ) or public.is_admin());

-- best_practices: vote/save counts are never client-writable (RPC/trigger only)
create policy "best_practices_select_public" on public.best_practices
  for select to anon, authenticated using (true);
create policy "best_practices_insert_self" on public.best_practices
  for insert to authenticated with check (author_id = public.current_participant_id(event_id));
create policy "best_practices_update_author_or_admin" on public.best_practices
  for update to authenticated
  using (author_id = public.current_participant_id(event_id) or public.is_admin())
  with check (author_id = public.current_participant_id(event_id) or public.is_admin());
revoke update on public.best_practices from authenticated;
grant update (title, body, category) on public.best_practices to authenticated;

create policy "best_practice_upvotes_select_public" on public.best_practice_upvotes
  for select to anon, authenticated using (true);
create policy "best_practice_upvotes_owner" on public.best_practice_upvotes
  for all to authenticated
  using (participant_id = public.current_participant_id(
    (select event_id from public.best_practices where id = best_practice_id)
  ))
  with check (participant_id = public.current_participant_id(
    (select event_id from public.best_practices where id = best_practice_id)
  ));

create policy "best_practice_saves_select_public" on public.best_practice_saves
  for select to anon, authenticated using (true);
create policy "best_practice_saves_owner" on public.best_practice_saves
  for all to authenticated
  using (participant_id = public.current_participant_id(
    (select event_id from public.best_practices where id = best_practice_id)
  ))
  with check (participant_id = public.current_participant_id(
    (select event_id from public.best_practices where id = best_practice_id)
  ));

create policy "best_practice_comments_select_public" on public.best_practice_comments
  for select to anon, authenticated using (true);
create policy "best_practice_comments_insert_self" on public.best_practice_comments
  for insert to authenticated with check (author_id = public.current_participant_id(
    (select event_id from public.best_practices where id = best_practice_id)
  ));
create policy "best_practice_comments_delete_author_or_admin" on public.best_practice_comments
  for delete to authenticated
  using (author_id = public.current_participant_id(
    (select event_id from public.best_practices where id = best_practice_id)
  ) or public.is_admin());

-- discussions: only admin can convert to a physical circle
create policy "discussions_select_public" on public.discussions
  for select to anon, authenticated using (true);
create policy "discussions_insert_self" on public.discussions
  for insert to authenticated with check (created_by = public.current_participant_id(event_id));
create policy "discussions_update_creator_or_admin" on public.discussions
  for update to authenticated
  using (created_by = public.current_participant_id(event_id) or public.is_admin())
  with check (created_by = public.current_participant_id(event_id) or public.is_admin());
revoke update on public.discussions from authenticated;
grant update (topic, description) on public.discussions to authenticated;

create policy "discussion_members_select_public" on public.discussion_members
  for select to anon, authenticated using (true);
create policy "discussion_members_join_self" on public.discussion_members
  for insert to authenticated with check (participant_id = public.current_participant_id(
    (select event_id from public.discussions where id = discussion_id)
  ));
create policy "discussion_members_leave_self_or_admin" on public.discussion_members
  for delete to authenticated
  using (participant_id = public.current_participant_id(
    (select event_id from public.discussions where id = discussion_id)
  ) or public.is_admin());

-- screen_commands: public (kiosk) read; TV (anon) may only ack delivery,
-- issuing commands is admin-only (via the service-role client)
create policy "screen_commands_select_public" on public.screen_commands
  for select to anon, authenticated using (true);
create policy "screen_commands_tv_ack" on public.screen_commands
  for update to anon, authenticated using (true) with check (true);
revoke update on public.screen_commands from anon, authenticated;
grant update (status, delivered_at) on public.screen_commands to anon, authenticated;

-- screen_activity_queue: public (kiosk) read only, no client writes at all
create policy "screen_activity_queue_select_public" on public.screen_activity_queue
  for select to anon, authenticated using (true);

-- analytics_events: write-only tracking log, admin-only read, immutable
create policy "analytics_events_insert_public" on public.analytics_events
  for insert to anon, authenticated with check (true);
create policy "analytics_events_select_admin" on public.analytics_events
  for select to authenticated using (public.is_admin());
