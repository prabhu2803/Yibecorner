"use client"

import * as React from "react"

import { createClient } from "@/lib/supabase/client"
import { realtimeChannels } from "@/lib/realtime/channels"
import type { Database } from "@/types/database.types"

type EventStats = Database["public"]["Tables"]["event_stats"]["Row"]

/**
 * Subscribes to the single `event_stats` row for an event. This is the only
 * thing driving the six live counters — never subscribe to the raw
 * challenges/best_practices/etc. tables just to derive a count.
 */
export function useRealtimeCounters(eventId: string, initial: EventStats | null) {
  const [stats, setStats] = React.useState<EventStats | null>(initial)

  React.useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(realtimeChannels.stats(eventId))
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "event_stats",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => setStats(payload.new as EventStats)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  return stats
}
