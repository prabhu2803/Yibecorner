// Hand-authored to match supabase/migrations/*.sql. Once the project is
// connected to a real Supabase instance, regenerate the authoritative
// version with:
//   npx supabase gen types typescript --project-id <ref> > types/database.types.ts
// (or --local against a running `supabase start` stack) and diff against
// this file before committing.
//
// Every table declares `Relationships` (even if empty) and the schema
// declares `Views` because @supabase/postgrest-js's `GenericSchema` /
// `GenericTable` constraints require them — omitting either silently
// collapses all query result types to `never` instead of erroring loudly.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type BusinessStage = "idea" | "early_stage" | "growth" | "scaling" | "established"
export type EventStatus = "draft" | "live" | "ended"
export type MatchStatus = "suggested" | "viewed" | "connect_requested" | "dismissed"
export type ConnectionStatus = "pending" | "accepted" | "declined" | "expired"
export type ConnectionMethod = "qr" | "nfc" | "manual" | "match"
export type ChallengeStatus = "open" | "solved" | "closed"
export type DiscussionStatus = "open" | "converted" | "closed"
export type ScreenCommandType =
  | "replay_intro"
  | "show_qr"
  | "hide_qr"
  | "trigger_celebration"
  | "trigger_announcement"
  | "toggle_participant_names"
  | "emergency_static_mode"
export type ScreenCommandStatus = "pending" | "delivered" | "acknowledged"
export type ActivityType =
  | "participant_joined"
  | "connection_verified"
  | "challenge_posted"
  | "challenge_solved"
  | "best_practice_shared"
  | "discussion_milestone"
  | "announcement"
export type VibiState =
  | "idle"
  | "wave"
  | "heart"
  | "celebrate"
  | "thinking"
  | "sleeping"
  | "wake"
  | "look_at_qr"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>
        Relationships: []
      }
      events: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          status: EventStatus
          starts_at: string | null
          ends_at: string | null
          timezone: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]> & {
          slug: string
          name: string
        }
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>
        Relationships: []
      }
      event_settings: {
        Row: {
          id: string
          event_id: string
          show_qr: boolean
          show_participant_names: boolean
          emergency_static_mode: boolean
          intro_last_played_at: string | null
          theme: Json
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["event_settings"]["Row"]> & {
          event_id: string
        }
        Update: Partial<Database["public"]["Tables"]["event_settings"]["Row"]>
        Relationships: []
      }
      event_stats: {
        Row: {
          event_id: string
          entrepreneurs_joined: number
          verified_connections: number
          challenges_posted: number
          problems_solved: number
          best_practices_shared: number
          discussions_active: number
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["event_stats"]["Row"]> & {
          event_id: string
        }
        Update: Partial<Database["public"]["Tables"]["event_stats"]["Row"]>
        Relationships: []
      }
      event_participants: {
        Row: {
          id: string
          event_id: string
          user_id: string
          full_name: string
          company: string | null
          designation: string | null
          city: string | null
          industry: string
          industry_other: string | null
          business_stage: BusinessStage
          looking_for: string[]
          can_help_with: string[]
          biggest_challenge: string | null
          challenge_category: string | null
          future_self_aspiration: string | null
          future_self_image_url: string | null
          personal_qr_token: string
          contribution_score: number
          onboarding_completed_at: string | null
          joined_at: string
          is_visible: boolean
        }
        Insert: Partial<Database["public"]["Tables"]["event_participants"]["Row"]> & {
          event_id: string
          user_id: string
          full_name: string
          industry: string
          business_stage: BusinessStage
        }
        Update: Partial<Database["public"]["Tables"]["event_participants"]["Row"]>
        Relationships: []
      }
      participant_contacts: {
        Row: {
          participant_id: string
          event_id: string
          mobile_number: string
          whatsapp_number: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["participant_contacts"]["Row"]> & {
          participant_id: string
          event_id: string
          mobile_number: string
          whatsapp_number: string
        }
        Update: Partial<Database["public"]["Tables"]["participant_contacts"]["Row"]>
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          event_id: string
          participant_id: string
          matched_participant_id: string
          score: number
          score_breakdown: Json
          reasons: string[]
          conversation_starter: string | null
          status: MatchStatus
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["matches"]["Row"]> & {
          event_id: string
          participant_id: string
          matched_participant_id: string
          score: number
        }
        Update: Partial<Database["public"]["Tables"]["matches"]["Row"]>
        Relationships: []
      }
      connections: {
        Row: {
          id: string
          event_id: string
          requester_id: string
          recipient_id: string
          status: ConnectionStatus
          initiated_via: ConnectionMethod
          message: string | null
          scanned_at: string
          verified_at: string | null
          expires_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["connections"]["Row"]> & {
          event_id: string
          requester_id: string
          recipient_id: string
        }
        Update: Partial<Database["public"]["Tables"]["connections"]["Row"]>
        Relationships: []
      }
      challenges: {
        Row: {
          id: string
          event_id: string
          author_id: string
          title: string
          description: string
          category: string | null
          status: ChallengeStatus
          solved_by_response_id: string | null
          is_flagged: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["challenges"]["Row"]> & {
          event_id: string
          author_id: string
          title: string
          description: string
        }
        Update: Partial<Database["public"]["Tables"]["challenges"]["Row"]>
        Relationships: []
      }
      challenge_responses: {
        Row: {
          id: string
          challenge_id: string
          author_id: string
          body: string
          is_introduction_offer: boolean
          is_flagged: boolean
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["challenge_responses"]["Row"]> & {
          challenge_id: string
          author_id: string
          body: string
        }
        Update: Partial<Database["public"]["Tables"]["challenge_responses"]["Row"]>
        Relationships: [
          {
            foreignKeyName: "challenge_responses_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      best_practices: {
        Row: {
          id: string
          event_id: string
          author_id: string
          title: string
          body: string
          category: string | null
          upvote_count: number
          save_count: number
          is_flagged: boolean
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["best_practices"]["Row"]> & {
          event_id: string
          author_id: string
          title: string
          body: string
        }
        Update: Partial<Database["public"]["Tables"]["best_practices"]["Row"]>
        Relationships: []
      }
      best_practice_upvotes: {
        Row: { best_practice_id: string; participant_id: string; created_at: string }
        Insert: { best_practice_id: string; participant_id: string; created_at?: string }
        Update: Partial<Database["public"]["Tables"]["best_practice_upvotes"]["Row"]>
        Relationships: []
      }
      best_practice_saves: {
        Row: { best_practice_id: string; participant_id: string; created_at: string }
        Insert: { best_practice_id: string; participant_id: string; created_at?: string }
        Update: Partial<Database["public"]["Tables"]["best_practice_saves"]["Row"]>
        Relationships: []
      }
      best_practice_comments: {
        Row: {
          id: string
          best_practice_id: string
          author_id: string
          body: string
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["best_practice_comments"]["Row"]> & {
          best_practice_id: string
          author_id: string
          body: string
        }
        Update: Partial<Database["public"]["Tables"]["best_practice_comments"]["Row"]>
        Relationships: []
      }
      discussions: {
        Row: {
          id: string
          event_id: string
          created_by: string
          topic: string
          description: string | null
          industry: string | null
          participant_count: number
          status: DiscussionStatus
          converted_to_circle_at: string | null
          circle_location: string | null
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["discussions"]["Row"]> & {
          event_id: string
          created_by: string
          topic: string
        }
        Update: Partial<Database["public"]["Tables"]["discussions"]["Row"]>
        Relationships: []
      }
      discussion_members: {
        Row: { discussion_id: string; participant_id: string; joined_at: string }
        Insert: { discussion_id: string; participant_id: string; joined_at?: string }
        Update: Partial<Database["public"]["Tables"]["discussion_members"]["Row"]>
        Relationships: []
      }
      discussion_messages: {
        Row: {
          id: string
          discussion_id: string
          author_id: string
          body: string
          is_flagged: boolean
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["discussion_messages"]["Row"]> & {
          discussion_id: string
          author_id: string
          body: string
        }
        Update: Partial<Database["public"]["Tables"]["discussion_messages"]["Row"]>
        Relationships: []
      }
      screen_commands: {
        Row: {
          id: string
          event_id: string
          command_type: ScreenCommandType
          payload: Json
          issued_by: string | null
          status: ScreenCommandStatus
          created_at: string
          delivered_at: string | null
        }
        Insert: Partial<Database["public"]["Tables"]["screen_commands"]["Row"]> & {
          event_id: string
          command_type: ScreenCommandType
        }
        Update: Partial<Database["public"]["Tables"]["screen_commands"]["Row"]>
        Relationships: []
      }
      screen_activity_queue: {
        Row: {
          id: string
          event_id: string
          activity_type: ActivityType
          payload: Json
          vibi_state: VibiState | null
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["screen_activity_queue"]["Row"]> & {
          event_id: string
          activity_type: ActivityType
        }
        Update: Partial<Database["public"]["Tables"]["screen_activity_queue"]["Row"]>
        Relationships: []
      }
      analytics_events: {
        Row: {
          id: string
          event_id: string
          participant_id: string | null
          event_name: string
          metadata: Json
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["analytics_events"]["Row"]> & {
          event_id: string
          event_name: string
        }
        Update: Partial<Database["public"]["Tables"]["analytics_events"]["Row"]>
        Relationships: []
      }
    }
    Views: {
      event_participants_public: {
        Row: {
          id: string
          event_id: string
          full_name: string
          company: string | null
          designation: string | null
          city: string | null
          industry: string
          industry_other: string | null
          business_stage: BusinessStage
          looking_for: string[]
          can_help_with: string[]
          joined_at: string
        }
        Relationships: []
      }
      connections_public: {
        Row: {
          id: string
          event_id: string
          requester_id: string
          recipient_id: string
          verified_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      current_participant_id: { Args: { p_event_id: string }; Returns: string | null }
      toggle_upvote: { Args: { p_best_practice_id: string }; Returns: boolean }
      toggle_save: { Args: { p_best_practice_id: string }; Returns: boolean }
      mark_challenge_solved: { Args: { p_challenge_id: string; p_response_id: string }; Returns: void }
      expire_stale_connections: { Args: Record<string, never>; Returns: void }
      find_or_claim_participant_by_phone: {
        Args: { p_event_id: string; p_mobile_number: string }
        Returns: string | null
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
