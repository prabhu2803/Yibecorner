import { notFound } from "next/navigation"

import { TvExperience } from "@/components/tv/TvExperience"
import { getBaseUrl } from "@/lib/get-base-url"
import { getEventBySlug } from "@/lib/queries/events"

export default async function ScreenPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params
  const result = await getEventBySlug(eventSlug)
  if (!result) notFound()

  const baseUrl = await getBaseUrl()

  return (
    <TvExperience
      event={result.event}
      initialSettings={result.settings}
      initialStats={result.stats}
      joinUrl={`${baseUrl}/join/${eventSlug}`}
    />
  )
}
