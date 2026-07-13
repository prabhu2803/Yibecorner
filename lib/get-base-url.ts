import "server-only"

import { headers } from "next/headers"

/**
 * Absolute origin for the current request. QR codes must encode a fully
 * qualified URL (they're scanned outside any browser context), so we can't
 * just use a relative path here.
 */
export async function getBaseUrl() {
  const headerList = await headers()
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000"
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https"
  return `${protocol}://${host}`
}
