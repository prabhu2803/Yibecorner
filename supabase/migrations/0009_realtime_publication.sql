-- Only these tables get realtime fan-out. Deliberately excludes
-- event_participants, matches, and analytics_events (see design.md /
-- the plan's "Realtime fan-out cost" risk) since nothing subscribes to them.
alter publication supabase_realtime add table
  public.event_stats,
  public.screen_commands,
  public.screen_activity_queue,
  public.connections,
  public.challenges,
  public.challenge_responses,
  public.best_practices,
  public.discussions,
  public.discussion_members;
