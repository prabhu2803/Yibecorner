import { createBrowserClient } from "@supabase/ssr"

import { clientEnv } from "@/lib/env"
import type { Database } from "@/types/database.types"

// One client per browser tab is fine — @supabase/ssr memoizes internally,
// but we still only want to construct it lazily/once per module load.
export function createClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
