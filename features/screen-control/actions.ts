"use server"

import { assertAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database, Json } from "@/types/database.types"

type CommandType = Database["public"]["Tables"]["screen_commands"]["Row"]["command_type"]

// screen_commands has no INSERT policy for any client role (see
// supabase/migrations/0007_rls_policies.sql) — issuing a command is
// exclusively an admin, service-role operation.
export async function issueScreenCommand(
  eventId: string,
  commandType: CommandType,
  payload: Record<string, Json> = {}
) {
  const admin = await assertAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.from("screen_commands").insert({
    event_id: eventId,
    command_type: commandType,
    payload,
    issued_by: admin.id,
  })

  if (error) return { success: false as const, error: error.message }
  return { success: true as const }
}
