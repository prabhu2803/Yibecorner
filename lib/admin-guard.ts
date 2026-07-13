import "server-only"

import { createClient } from "@/lib/supabase/server"

/**
 * Every admin Server Action re-checks this itself — middleware.ts already
 * gates /admin/* pages, but Server Actions are independently reachable via
 * a direct POST, so render-time gating alone isn't a security boundary.
 */
export async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== "admin") {
    throw new Error("Forbidden: admin only")
  }

  return user
}
