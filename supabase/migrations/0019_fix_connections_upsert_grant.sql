-- sendConnectionRequest's upsert (ON CONFLICT DO UPDATE on
-- event_id,requester_id,recipient_id) touches every column in its payload
-- when Postgres plans the statement, regardless of whether a conflict
-- actually happens at runtime — same root cause as the
-- 0012_fix_event_participants_upsert_grant fix. Only `status` was
-- previously grant-updatable, so a second request between the same two
-- people (or the reciprocal direction) failed with "permission denied".
grant update (
  event_id, requester_id, recipient_id, initiated_via, message, scanned_at, status
) on public.connections to authenticated;
