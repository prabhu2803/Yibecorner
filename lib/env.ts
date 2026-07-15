import { z } from "zod"

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_DEFAULT_EVENT_SLUG: z.string().min(1).default("yifi-2026"),
})

const serverSchema = clientSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  // Optional — Future Self image generation (generateFutureSelfImage.ts)
  // falls back to the placeholder reveal card when this isn't set, rather
  // than throwing, so the app works with no key configured.
  GEMINI_API_KEY: z.string().min(1).optional(),
})

function parse<T extends z.ZodTypeAny>(schema: T, values: Record<string, string | undefined>) {
  const parsed = schema.safeParse(values)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n")
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  return parsed.data as z.infer<T>
}

// Safe to import from Client Components — only NEXT_PUBLIC_* values.
export const clientEnv = parse(clientSchema, {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_DEFAULT_EVENT_SLUG: process.env.NEXT_PUBLIC_DEFAULT_EVENT_SLUG,
})

// Server-only — includes the service role key. Never import from a Client Component.
export const serverEnv = parse(serverSchema, {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_DEFAULT_EVENT_SLUG: process.env.NEXT_PUBLIC_DEFAULT_EVENT_SLUG,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
})
