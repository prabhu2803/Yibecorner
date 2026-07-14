-- The status rename (verified -> accepted, rejected -> declined) in
-- 0017 left this trigger watching for a value that can no longer occur,
-- silently breaking the stats bump + TV heart celebration. Point it at
-- the new value. ("Accepted" is the closest equivalent milestone until
-- Phase 3 adds a more precise "met in person" / "contact exchanged"
-- signal — worth revisiting the stat's meaning then.)
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
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
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
