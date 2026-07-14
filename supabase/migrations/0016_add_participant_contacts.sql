-- Mobile/WhatsApp numbers for the post-consent contact-exchange flow.
-- Lives in its own table (not columns on event_participants) because
-- event_participants has a public select policy ("public read for
-- discovery/matching" per design.md) — a column there would be readable by
-- any authenticated participant regardless of what our own queries select.
-- This table has no public/anon select policy at all: only the owning
-- participant (via current_participant_id(), resolved from auth.uid()) or
-- an admin can ever read a row.
create table public.participant_contacts (
  participant_id uuid primary key references public.event_participants(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  mobile_number text not null,
  whatsapp_number text not null,
  updated_at timestamptz not null default now()
);

alter table public.participant_contacts enable row level security;

create policy "participant_contacts_select_self_or_admin" on public.participant_contacts
  for select to authenticated
  using (participant_id = public.current_participant_id(event_id) or public.is_admin());

create policy "participant_contacts_insert_self" on public.participant_contacts
  for insert to authenticated
  with check (participant_id = public.current_participant_id(event_id));

create policy "participant_contacts_update_self" on public.participant_contacts
  for update to authenticated
  using (participant_id = public.current_participant_id(event_id))
  with check (participant_id = public.current_participant_id(event_id));
