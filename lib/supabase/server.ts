import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import { clientEnv } from "@/lib/env"
import type { Database } from "@/types/database.types"

// For use in Server Components, Server Actions, and Route Handlers. Reads
// the participant's (or admin's) session from cookies, so all queries run
// through RLS as that user — never use this for privileged writes.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Called from a Server Component that can't set cookies (no
            // active response, e.g. during a static render) — safe to
            // ignore as long as middleware refreshes the session.
          }
        },
      },
    }
  )
}
