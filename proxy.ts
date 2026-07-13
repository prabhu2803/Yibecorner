import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { clientEnv } from "@/lib/env"

// Refreshes the Supabase session on every request and gates /admin/* routes
// behind an authenticated user whose JWT carries app_metadata.role = 'admin'
// (set at account-creation time by scripts/seed.ts or an admin invite flow —
// never trust a client-supplied role).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin")
  const isLoginRoute = request.nextUrl.pathname.startsWith("/admin/login")

  if (isAdminRoute && !isLoginRoute) {
    const role = user?.app_metadata?.role
    if (!user || role !== "admin") {
      const loginUrl = new URL("/admin/login", request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and Next internals, so the
     * Supabase session cookie stays fresh across the whole app.
     */
    "/((?!_next/static|_next/image|favicon.ico|videos/|vibi/|logos/|images/).*)",
  ],
}
