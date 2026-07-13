// Centralized channel-name builders so every subscriber (TV, participant
// app, admin dashboard) agrees on the same channel topic for a given
// concern. See design.md "Realtime channel design" for which client
// subscribes to which of these and why.

export const realtimeChannels = {
  screen: (eventId: string) => `screen:${eventId}`,
  stats: (eventId: string) => `stats:${eventId}`,
  connections: (participantId: string) => `connections:${participantId}`,
  challenge: (challengeId: string) => `challenge:${challengeId}`,
  bestPractice: (practiceId: string) => `best-practice:${practiceId}`,
  discussion: (discussionId: string) => `discussion:${discussionId}`,
  adminModeration: (eventId: string) => `admin-moderation:${eventId}`,
  adminConnections: (eventId: string) => `admin-connections:${eventId}`,
} as const
