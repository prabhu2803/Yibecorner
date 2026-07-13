import { createClient } from "@/lib/supabase/server"

export async function getEventBySlug(slug: string) {
  const supabase = await createClient()

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (error) throw error
  if (!event) return null

  const [{ data: settings }, { data: stats }] = await Promise.all([
    supabase.from("event_settings").select("*").eq("event_id", event.id).maybeSingle(),
    supabase.from("event_stats").select("*").eq("event_id", event.id).maybeSingle(),
  ])

  return { event, settings, stats }
}

export async function getAllEvents() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Resolves the event an admin page should operate on from `?event=slug`, defaulting sensibly. */
export async function resolveAdminEvent(eventSlugParam: string | undefined) {
  const events = await getAllEvents()
  const fallback = events.find((e) => e.status === "live") ?? events[0]
  const slug = eventSlugParam ?? fallback?.slug
  const current = slug ? events.find((e) => e.slug === slug) ?? null : null
  return { events, current: current ?? fallback ?? null }
}
