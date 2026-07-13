"use client"

export function HeroVideoPanel() {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-primary/20 shadow-2xl">
      <video
        src="/videos/vibe-corner-hero-intro.mp4"
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      />
    </div>
  )
}
