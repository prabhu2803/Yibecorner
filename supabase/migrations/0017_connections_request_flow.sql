-- Phase 2 of the networking rework: a QR scan (or a "Connect" tap from a
-- match card) no longer instantly creates a connection — it opens a
-- request that the recipient must explicitly accept or decline.
alter table public.connections
  add column message text null;

alter table public.connections
  drop constraint connections_status_check;
alter table public.connections
  add constraint connections_status_check
  check (status in ('pending', 'accepted', 'declined', 'expired'));

alter table public.connections
  drop constraint connections_initiated_via_check;
alter table public.connections
  add constraint connections_initiated_via_check
  check (initiated_via in ('qr', 'nfc', 'manual', 'match'));

-- The old 2-minute window assumed an in-person reciprocal-scan confirm.
-- A request now waits on the recipient noticing and responding, which
-- reasonably spans the rest of the event, not two minutes.
alter table public.connections
  alter column expires_at set default (now() + interval '7 days');
