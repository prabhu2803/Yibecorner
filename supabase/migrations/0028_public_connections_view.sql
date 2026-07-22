-- Public "who connected with whom" view for the landing-page live board
-- (features/board/LiveBoard.tsx). Deliberate, explicit privacy exposure
-- confirmed with the product owner: today `connections` is locked to
-- `to authenticated` and only the requester/recipient/admin can see a
-- given row (0007_rls_policies.sql:76-83) — this view intentionally
-- narrows and re-exposes only ACCEPTED (verified) pairs publicly, never
-- pending/declined/expired requests, and never the `message` column
-- (a personal note between the two participants).
--
-- Unlike event_participants_public (0027), this view does NOT set
-- security_invoker — the base connections RLS grants anon nothing at
-- all, so security_invoker would just return zero rows. Instead the
-- view runs with its owner's privileges (bypassing the base table's
-- RLS by design) and its own WHERE clause is the entire safety
-- boundary: only status = 'accepted', only id/participant-id/verified_at.
create view public.connections_public as
select id, event_id, requester_id, recipient_id, verified_at
from public.connections
where status = 'accepted';

grant select on public.connections_public to anon, authenticated;
