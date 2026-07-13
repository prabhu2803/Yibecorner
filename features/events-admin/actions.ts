"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { assertAdmin } from "@/lib/admin-guard"
import { createClient } from "@/lib/supabase/server"

const eventSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
})

// Bound directly to <form action={...}>, so these return void (Promise<void>)
// and throw on failure rather than returning a {success,error} object.

export async function createEvent(formData: FormData) {
  await assertAdmin()
  const parsed = eventSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  })
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input")

  const supabase = await createClient()
  const { error } = await supabase.from("events").insert({
    name: parsed.data.name,
    slug: parsed.data.slug,
    status: "draft",
  })

  if (error) throw new Error(error.message)
  revalidatePath("/admin/events")
}

export async function setEventStatus(eventId: string, status: "draft" | "live" | "ended") {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from("events").update({ status }).eq("id", eventId)

  if (error) throw new Error(error.message)
  revalidatePath("/admin/events")
}
