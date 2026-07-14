-- Discussion messages: lightweight chat thread per discussion. Reading is
-- public like every other YIBE Corner table (challenges/best_practices
-- follow the same select-public pattern), but posting is gated on actually
-- having joined via discussion_members — this is what gives "join
-- discussion" real teeth instead of just adding your name to a roster.
create table public.discussion_messages (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  author_id uuid not null references public.event_participants(id) on delete cascade,
  body text not null,
  is_flagged boolean not null default false,
  created_at timestamptz not null default now()
);
create index discussion_messages_discussion_idx on public.discussion_messages (discussion_id, created_at);

alter table public.discussion_messages enable row level security;

create policy "discussion_messages_select_public" on public.discussion_messages
  for select to anon, authenticated using (true);

create policy "discussion_messages_insert_member" on public.discussion_messages
  for insert to authenticated with check (
    author_id = public.current_participant_id(
      (select event_id from public.discussions where id = discussion_id)
    )
    and exists (
      select 1 from public.discussion_members
      where discussion_id = discussion_messages.discussion_id
        and participant_id = discussion_messages.author_id
    )
  );

create policy "discussion_messages_delete_author_or_admin" on public.discussion_messages
  for delete to authenticated
  using (
    author_id = public.current_participant_id(
      (select event_id from public.discussions where id = discussion_id)
    )
    or public.is_admin()
  );

alter publication supabase_realtime add table public.discussion_messages;
