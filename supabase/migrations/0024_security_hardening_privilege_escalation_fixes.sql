-- CRITICAL: profiles had no column-level grant restriction on UPDATE, so
-- any authenticated user could run
--   update profiles set is_admin = true where id = auth.uid()
-- and pass every "or public.is_admin()" RLS bypass clause in the schema.
-- Confirmed live via information_schema.role_table_grants before this fix.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- HIGH: connections_update_recipient_or_admin's WITH CHECK only verified
-- recipient_id ownership, never pinning event_id/requester_id/message/
-- initiated_via/scanned_at to their prior values — combined with 0019's
-- broad column grant (needed for sendConnectionRequest's upsert to be
-- plannable), a recipient accepting/declining could also rewrite who the
-- connection is with, or backdate/alter the original request's message.
-- Fix: a trigger enforcing identity-field immutability for everyone, and
-- restricting the recipient specifically to status-only changes. The
-- requester's own re-request upsert is unaffected: ON CONFLICT DO UPDATE
-- only ever fires when event_id/requester_id/recipient_id already match
-- the existing row, so this trigger never blocks a legitimate upsert.
create or replace function public.enforce_connections_update_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_participant_id uuid := public.current_participant_id(old.event_id);
begin
  if new.event_id is distinct from old.event_id
    or new.requester_id is distinct from old.requester_id
    or new.recipient_id is distinct from old.recipient_id
  then
    raise exception 'connections.event_id/requester_id/recipient_id are immutable';
  end if;

  if v_caller_participant_id = old.recipient_id and not public.is_admin() then
    if new.message is distinct from old.message
      or new.initiated_via is distinct from old.initiated_via
      or new.scanned_at is distinct from old.scanned_at
    then
      raise exception 'recipients may only update status';
    end if;
  end if;

  return new;
end;
$$;

create trigger connections_enforce_update_rules
  before update on public.connections
  for each row execute function public.enforce_connections_update_rules();

-- HIGH: challenges' client grant included status + solved_by_response_id
-- with no check that the response actually belongs to this challenge —
-- letting an author self-mark "solved" and award +10 contribution_score
-- to any participant's response, from any challenge. Move this behind a
-- SECURITY DEFINER RPC that verifies both authorship and that the
-- response belongs to the challenge, matching the toggle_upvote/
-- toggle_save pattern already used for best_practices.
revoke update (status, solved_by_response_id) on public.challenges from authenticated;

create or replace function public.mark_challenge_solved(p_challenge_id uuid, p_response_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_event_id uuid;
  v_response_challenge_id uuid;
begin
  select author_id, event_id into v_author_id, v_event_id
    from public.challenges where id = p_challenge_id;

  if v_author_id is null then
    raise exception 'Challenge not found';
  end if;

  if v_author_id <> public.current_participant_id(v_event_id) and not public.is_admin() then
    raise exception 'Only the challenge author or an admin can mark it solved';
  end if;

  select challenge_id into v_response_challenge_id
    from public.challenge_responses where id = p_response_id;

  if v_response_challenge_id is distinct from p_challenge_id then
    raise exception 'That response does not belong to this challenge';
  end if;

  update public.challenges
    set status = 'solved', solved_by_response_id = p_response_id
    where id = p_challenge_id;
end;
$$;

grant execute on function public.mark_challenge_solved(uuid, uuid) to authenticated;

-- MEDIUM-HIGH: challenge_responses had no column-grant restriction at all
-- and its UPDATE policy's WITH CHECK was literally (true) — an author
-- could unflag their own moderated response, or reassign author_id/
-- challenge_id in the same request. Restrict to the two fields an author
-- legitimately edits, and require ownership to still hold post-update.
revoke update on public.challenge_responses from authenticated;
grant update (body, is_introduction_offer) on public.challenge_responses to authenticated;

drop policy "challenge_responses_update_author_or_admin" on public.challenge_responses;
create policy "challenge_responses_update_author_or_admin" on public.challenge_responses
  for update to authenticated
  using (author_id = public.current_participant_id(
    (select event_id from public.challenges where id = challenge_id)
  ) or public.is_admin())
  with check (author_id = public.current_participant_id(
    (select event_id from public.challenges where id = challenge_id)
  ) or public.is_admin());

-- MEDIUM: event_participants_select_public was `using (true)` with no
-- is_visible check at all, so an admin "Hide" action never actually hid
-- anyone from direct API reads — only matchmaking's own query excluded
-- them. Keep it publicly readable when visible, but let a hidden
-- participant still see themselves, and let admins always see everyone.
drop policy "event_participants_select_public" on public.event_participants;
create policy "event_participants_select_public" on public.event_participants
  for select to anon, authenticated
  using (is_visible = true or user_id = auth.uid() or public.is_admin());
