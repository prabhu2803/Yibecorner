-- handle_new_user() (AFTER INSERT) alone isn't enough: GoTrue's
-- admin.createUser({ app_metadata }) applies custom app_metadata as a
-- follow-up step rather than atomically with the initial auth.users
-- INSERT, so the insert trigger can capture a row whose
-- raw_app_meta_data.role isn't set yet — verified directly: a freshly
-- created admin account came out with profiles.is_admin = false even
-- though raw_app_meta_data.role was correctly 'admin' moments later.
-- This also covers promoting an existing user to admin afterwards (e.g.
-- via the dashboard), which nothing previously kept in sync.
create or replace function public.handle_user_metadata_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
    set is_admin = coalesce((new.raw_app_meta_data ->> 'role') = 'admin', false),
        updated_at = now()
    where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_metadata_updated
  after update of raw_app_meta_data on auth.users
  for each row execute function public.handle_user_metadata_updated();

-- Fix the admin account created moments ago under the old (buggy) behavior.
update public.profiles set is_admin = true
where id in (select id from auth.users where raw_app_meta_data ->> 'role' = 'admin');
