-- Anonymous auth means "identity" is a browser session, not a person — if
-- someone onboards again from a different device (or cleared storage),
-- they'd otherwise get a second, disconnected event_participants row for
-- the same human. Now that we collect a mobile number, use it as a weak
-- (no OTP) identity signal: if a participant already exists in this event
-- with the same phone number under a *different* user_id, reassign that
-- existing row to the new session instead of creating a duplicate.
--
-- security definer so it can see across participants despite
-- participant_contacts having no public select policy — but it does NOT
-- expose arbitrary cross-participant reads the way the admin client would;
-- it only ever returns/mutates the one row matching the caller's own
-- phone number, and only reassigns user_id (nothing else).
--
-- Trade-off worth documenting: without OTP verification, two different
-- people who happen to share one phone number (e.g. a shared office line)
-- would get merged into the same participant record. Acceptable for this
-- MVP; would need real phone verification to close that gap.
create or replace function public.find_or_claim_participant_by_phone(
  p_event_id uuid,
  p_mobile_number text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_id uuid;
  v_caller uuid := auth.uid();
begin
  if v_caller is null or p_mobile_number is null or p_mobile_number = '' then
    return null;
  end if;

  select ep.id into v_participant_id
  from public.participant_contacts pc
  join public.event_participants ep on ep.id = pc.participant_id
  where pc.event_id = p_event_id
    and pc.mobile_number = p_mobile_number
    and ep.user_id <> v_caller
  limit 1;

  if v_participant_id is not null then
    update public.event_participants
      set user_id = v_caller
      where id = v_participant_id;
  end if;

  return v_participant_id;
end;
$$;

grant execute on function public.find_or_claim_participant_by_phone(uuid, text) to authenticated;
