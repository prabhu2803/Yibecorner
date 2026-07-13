"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Database } from "@/types/database.types"

type EventRow = Database["public"]["Tables"]["events"]["Row"]

export function EventSwitcher({ events, currentSlug }: { events: EventRow[]; currentSlug?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function onChange(slug: string) {
    const params = new URLSearchParams(searchParams?.toString())
    params.set("event", slug)
    router.push(`${pathname}?${params.toString()}`)
  }

  if (events.length === 0) return null

  return (
    <Select value={currentSlug} onValueChange={onChange}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select event" />
      </SelectTrigger>
      <SelectContent>
        {events.map((event) => (
          <SelectItem key={event.id} value={event.slug}>
            {event.name} ({event.status})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
