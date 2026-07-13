"use server"

import { createClient } from "@/lib/supabase/server"

export async function markMatchConnectRequested(matchId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("matches")
    .update({ status: "connect_requested" })
    .eq("id", matchId)

  if (error) return { success: false as const, error: error.message }
  return { success: true as const }
}
