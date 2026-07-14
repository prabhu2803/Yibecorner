-- Free-text elaboration captured when a participant picks "Other" for
-- industry in onboarding. Nullable: only meaningful when industry = 'other'.
alter table public.event_participants
  add column if not exists industry_other text null;

grant update (industry_other) on public.event_participants to authenticated;
