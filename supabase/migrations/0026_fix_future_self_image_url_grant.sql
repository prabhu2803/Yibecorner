-- 0025_future_self_images.sql added this column but never granted
-- authenticated UPDATE on it — INSERT ... ON CONFLICT DO UPDATE requires
-- UPDATE privilege on every column in the SET clause at query-plan time
-- regardless of whether a conflict occurs at runtime (same gotcha hit
-- twice before this session, for event_participants and connections).
-- completeOnboarding's upsert includes future_self_image_url whenever a
-- selfie-based photo was generated, so any such save failed with
-- "permission denied for table event_participants".
grant update (future_self_image_url) on public.event_participants to authenticated;
