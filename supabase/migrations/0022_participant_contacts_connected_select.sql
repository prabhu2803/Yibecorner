-- Once two participants have an *accepted* connection, each may read the
-- other's contact row (needed for the WhatsApp click-to-chat button on
-- the Connections page). Accepting a request is the consent signal that
-- unlocks this — it's scoped to exactly that pair, nothing broader.
create policy "participant_contacts_select_connected" on public.participant_contacts
  for select to authenticated
  using (
    exists (
      select 1 from public.connections c
      where c.status = 'accepted'
        and (
          (c.requester_id = participant_contacts.participant_id
            and c.recipient_id = public.current_participant_id(participant_contacts.event_id))
          or
          (c.recipient_id = participant_contacts.participant_id
            and c.requester_id = public.current_participant_id(participant_contacts.event_id))
        )
    )
  );
