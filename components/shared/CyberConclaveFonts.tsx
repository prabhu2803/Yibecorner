/**
 * Loads the Cyber-Conclave design system's fonts (Space Grotesk, Hanken
 * Grotesk, JetBrains Mono) + the Material Symbols Outlined variable font.
 * Rendered as plain <link> tags — React 19 hoists them into <head> and
 * dedupes by href, so it's safe to render this from multiple places
 * (onboarding, the post-onboarding app section) without double-loading.
 * Scoped to the .cc-scope-themed parts of the app only.
 */
export function CyberConclaveFonts() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router
          hoists <link> from any component into <head>; this lint rule predates
          that support and only knows about the Pages Router convention. */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap"
      />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
      />
    </>
  )
}
