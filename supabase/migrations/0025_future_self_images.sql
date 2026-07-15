alter table public.event_participants add column future_self_image_url text;

insert into storage.buckets (id, name, public)
values ('future-self-images', 'future-self-images', true)
on conflict (id) do nothing;

-- Souvenir images are shown to the participant (and meant to be
-- shareable), same public-exposure level as full_name/company already
-- have via event_participants_select_public.
create policy "future_self_images_select_public" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'future-self-images');

-- Path convention is {auth.uid()}/{uuid}.png — scoping the insert to the
-- caller's own uid prefix means one session can't overwrite another's
-- generated image.
create policy "future_self_images_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'future-self-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
