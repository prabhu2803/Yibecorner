import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createEvent } from "@/features/events-admin/actions"
import { getAllEvents } from "@/lib/queries/events"

export default async function AdminEventsPage() {
  const events = await getAllEvents()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Events</h1>

      <div className="admin-surface flex flex-col gap-3 p-4 md:flex-row md:items-end">
        <form action={createEvent} className="flex flex-1 flex-col gap-3 md:flex-row md:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input name="name" placeholder="YiFi 2027" required />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Slug</label>
            <Input name="slug" placeholder="yifi-2027" required />
          </div>
          <Button type="submit">Create Event</Button>
        </form>
      </div>

      <div className="flex flex-col gap-2">
        {events.map((event) => (
          <Link key={event.id} href={`/admin/events/${event.id}`}>
            <div className="admin-surface flex items-center justify-between p-4 transition hover:bg-white/5">
              <div>
                <p className="font-semibold">{event.name}</p>
                <p className="text-xs text-muted-foreground">/{event.slug}</p>
              </div>
              <Badge variant={event.status === "live" ? "secondary" : "outline"}>{event.status}</Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
