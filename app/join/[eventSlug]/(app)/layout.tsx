import { CyberConclaveFonts } from "@/components/shared/CyberConclaveFonts"
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
    <div className="cc-scope flex flex-1 flex-col pb-24 text-[var(--cc-on-surface)]">
      <CyberConclaveFonts />
      {/* MobileNav is fixed-positioned, so its surrounding inset-x-4/bottom-4
          margins fall outside any page's own bled background div — this
          viewport-fixed layer stops the old violet aurora background from
          showing through in that gap, on every page, at every width. */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-[var(--cc-surface)]" />
      {children}
      <MobileNav eventSlug={eventSlug} />
    </div>
  )
}
