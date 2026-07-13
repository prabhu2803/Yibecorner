import { notFound } from "next/navigation"

import { AuroraBackground } from "@/components/shared/AuroraBackground"
import { ParticipantSessionProvider } from "@/features/session/ParticipantSessionProvider"
import { getEventBySlug } from "@/lib/queries/events"

export default async function JoinLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params
  const result = await getEventBySlug(eventSlug)
  if (!result) notFound()

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <ParticipantSessionProvider event={result.event}>
        <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </ParticipantSessionProvider>
    </div>
  )
}
