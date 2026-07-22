-- Defense-in-depth for the public landing-page live board
-- (app/page.tsx + features/board/LiveBoard.tsx). event_participants
-- already has an anon-readable RLS policy (0007/0024), but that table
-- also carries personal_qr_token — a bearer credential for the QR-scan
-- connection flow (app/api/connections/verify/route.ts), not just
-- identity data. A view with an explicit column allowlist guarantees at
-- the database boundary that this token (and user_id/is_visible) can
-- never leak from the public board's query path, even from a future
-- application-code mistake.
--
-- security_invoker = true means this view still runs under the calling
-- role's own RLS — it's a column allowlist, not an RLS bypass.
create view public.event_participants_public
with (security_invoker = true) as
select
  id,
  event_id,
  full_name,
  company,
  designation,
  city,
  industry,
  industry_other,
  business_stage,
  looking_for,
  can_help_with,
  joined_at
from public.event_participants
where is_visible = true;

grant select on public.event_participants_public to anon, authenticated;
