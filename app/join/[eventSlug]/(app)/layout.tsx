import { MobileNav } from "@/components/shared/MobileNav"

export default async function ParticipantAppLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params

  return (
    <div className="flex flex-1 flex-col pb-24">
      {children}
      <MobileNav eventSlug={eventSlug} />
    </div>
  )
}
