"use client"

import { useParams } from "next/navigation"

import { ScanFlow } from "@/features/connections/ScanFlow"

export default function ScanPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>()
  return <ScanFlow eventSlug={eventSlug} />
}
