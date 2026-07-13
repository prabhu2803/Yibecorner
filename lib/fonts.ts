import { Space_Grotesk, Hanken_Grotesk, JetBrains_Mono, Orbitron } from "next/font/google"

// Scoped to the marketing landing page only (app/page.tsx) — the rest of the
// app keeps the Geist Sans/Mono set in app/layout.tsx.
export const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
})

// Angular, geometric display face for the hero headline — the "gaming site"
// look. Display-only; not used for body copy.
export const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
})

export const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

export const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
})
