import "server-only"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import { serverEnv } from "@/lib/env"
import type { Database } from "@/types/database.types"

// Service-role client — bypasses RLS entirely. Only import from trusted
// server-side code: admin Server Actions (after verifying the caller's
// session has app_metadata.role === 'admin') and scripts/seed.ts. Never
// import this from a Client Component or expose it to the browser bundle.
export function createAdminClient() {
  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  }

  return createSupabaseClient<Database>(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
