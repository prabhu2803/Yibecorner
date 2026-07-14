"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { StepCard } from "@/components/ui/step-card"
import { ChoiceGrid } from "@/features/onboarding/ChoiceGrid"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"
import { VibiMascot } from "@/features/vibi/VibiMascot"
import { completeOnboarding } from "@/features/onboarding/actions"
import { onboardingSchema, type OnboardingInput } from "@/features/onboarding/schema"
import { TagToggleGroup } from "@/features/onboarding/TagToggleGroup"
import { useParticipantSession } from "@/features/session/ParticipantSessionProvider"
import {
  BUSINESS_STAGES,
  CHALLENGE_CATEGORIES,
  CHALLENGE_CATEGORY_META,
  FUTURE_SELF_ASPIRATIONS,
  INDUSTRIES,
  INDUSTRY_META,
  TAGS,
} from "@/lib/constants"

const INDUSTRY_OPTIONS = INDUSTRIES.map((value) => ({ value, ...INDUSTRY_META[value] }))
const CHALLENGE_CATEGORY_OPTIONS = CHALLENGE_CATEGORIES.map((value) => ({ value, ...CHALLENGE_CATEGORY_META[value] }))

const FINDING_TRIBE_MESSAGES = [
  "Understanding your business...",
  "Looking for the right entrepreneurs...",
  "Finding people who can genuinely help...",
  "Building your networking journey...",
]

const GENERATING_MESSAGES = ["Building your future...", "Dreaming big...", "Adding a little magic...", "Almost there..."]

// Data-collection phases only — welcome/generating/finding-tribe are
// transient states, not "steps" with fields, so they're excluded from the
// progress bar's step count.
const STEP_ORDER = [
  "name",
  "company",
  "designation",
  "city",
  "industry",
  "stage",
  "future-self-pick",
  "looking-for",
  "can-help",
  "challenge",
] as const

type Phase = "welcome" | (typeof STEP_ORDER)[number] | "future-self-generating" | "future-self-reveal" | "finding-tribe"

/**
 * Loads the Cyber-Conclave reference's exact fonts + Material Symbols
 * variable font. Rendered as plain <link> tags — React 19 hoists them into
 * <head> and dedupes by href, so it's safe even though this renders inside
 * a client component nested arbitrarily deep in the tree. Scoped to
 * onboarding only: no other route renders this component.
 */
function CyberConclaveFonts() {
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

/**
 * Persistent chrome for every data-collection step: grid icon + wordmark on
 * the left, a dismiss glyph on the right — sticky (not fixed) so it stays
 * pinned while the step content scrolls without escaping the app's own
 * max-w-md column the way a viewport-fixed header would.
 */
function OnboardingTopBar() {
  return (
    <div className="sticky top-0 z-40 -mx-4 flex h-16 items-center justify-between border-b border-white/10 bg-[var(--cc-surface)]/85 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <MaterialIcon name="grid_view" className="text-[20px] text-[var(--cc-primary)]" />
        <span className="cc-headline text-sm font-bold tracking-tight text-[var(--cc-primary)]">VIBE CORNER</span>
      </div>
      <MaterialIcon name="close" className="text-[20px] text-[var(--cc-on-surface-variant)]/60" />
    </div>
  )
}

function VibiSpeech({ text }: { text: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <VibiMascot state="idle" size={40} />
      <div className="cc-glass-panel rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-[var(--cc-on-surface)]/90">
        {text}
      </div>
    </div>
  )
}

function useRotatingMessages(messages: string[], intervalMs: number) {
  const [index, setIndex] = React.useState(0)
  React.useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), intervalMs)
    return () => clearInterval(id)
  }, [messages.length, intervalMs])
  return messages[index]
}

export function OnboardingForm({ mode = "create" }: { mode?: "create" | "edit" }) {
  const router = useRouter()
  const { event, participant, refetchParticipant } = useParticipantSession()
  const [submitting, setSubmitting] = React.useState(false)
  const [phase, setPhase] = React.useState<Phase>(mode === "create" ? "welcome" : "name")
  const [direction, setDirection] = React.useState<1 | -1>(1)

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      fullName: participant?.full_name ?? "",
      company: participant?.company ?? "",
      designation: participant?.designation ?? "",
      city: participant?.city ?? "",
      industry: participant?.industry as OnboardingInput["industry"] | undefined,
      industryOther: participant?.industry_other ?? "",
      businessStage: participant?.business_stage,
      lookingFor: (participant?.looking_for as OnboardingInput["lookingFor"]) ?? [],
      canHelpWith: (participant?.can_help_with as OnboardingInput["canHelpWith"]) ?? [],
      biggestChallenge: participant?.biggest_challenge ?? "",
      challengeCategory: participant?.challenge_category as OnboardingInput["challengeCategory"] | undefined,
      futureSelfAspiration: participant?.future_self_aspiration ?? "",
    },
  })

  const stepIndex = STEP_ORDER.indexOf(phase as (typeof STEP_ORDER)[number])
  const isDataStep = stepIndex >= 0
  const stepsRemaining = STEP_ORDER.length - 1 - stepIndex
  const progressPct = isDataStep ? ((stepIndex + 1) / STEP_ORDER.length) * 100 : 0

  function goTo(next: Phase, dir: 1 | -1) {
    setDirection(dir)
    setPhase(next)
  }

  async function validateAndAdvance(fields: (keyof OnboardingInput)[], next: Phase) {
    const valid = await form.trigger(fields)
    if (!valid) return
    goTo(next, 1)
  }

  async function finish() {
    setSubmitting(true)
    const values = form.getValues()
    const result = await completeOnboarding(event.id, values)
    setSubmitting(false)

    if (!result.success) {
      toast.error(result.error)
      goTo("challenge", -1)
      return
    }

    await refetchParticipant()
    if (mode === "create") {
      router.replace(`/join/${event.slug}/home`)
    } else {
      toast.success("Profile updated")
    }
  }

  // "Finding Your Tribe" — fires the real save + match computation, then
  // redirects once done (minimum dwell time so the messages aren't a flash).
  React.useEffect(() => {
    if (phase !== "finding-tribe") return
    const started = Date.now()
    void (async () => {
      await finish()
      const elapsed = Date.now() - started
      if (elapsed < 2200) await new Promise((r) => setTimeout(r, 2200 - elapsed))
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // "Future Self Studio" reveal timer — hooks must run unconditionally on
  // every render (not just when phase === "future-self-generating"), so
  // this lives at the top level and gates its own body internally.
  React.useEffect(() => {
    if (phase !== "future-self-generating") return
    const t = setTimeout(() => goTo("future-self-reveal", 1), 2400)
    return () => clearTimeout(t)
  }, [phase])

  // Same rule applies to these — always called, values only used in the
  // matching phase's render branch below.
  const generatingMessage = useRotatingMessages(GENERATING_MESSAGES, 900)
  const findingTribeMessage = useRotatingMessages(FINDING_TRIBE_MESSAGES, 1100)

  let content: React.ReactNode

  if (phase === "welcome") {
    content = (
      <div className="cc-grid-bg relative -mx-4 flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="cc-glass-panel relative w-full max-w-sm rounded-3xl p-8 text-center">
          <span className="absolute top-5 right-5 text-[var(--cc-on-surface-variant)]/60">
            <MaterialIcon name="close" className="text-[22px]" />
          </span>

          <div className="flex justify-center">
            <VibiMascot state="wave" size={160} />
          </div>

          <h1 className="cc-headline mt-6 text-3xl font-bold text-[var(--cc-on-surface)]">Welcome to Vibe Corner</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm text-[var(--cc-on-surface-variant)]">
            Where entrepreneurs meet the right people, solve real business challenges, and build meaningful
            collaborations.
          </p>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={() => goTo("name", 1)}
              className="cc-neon-primary h-14 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] px-8 text-[var(--cc-on-primary)]"
              size="lg"
            >
              Let&apos;s Begin
            </Button>
          </div>
        </div>
      </div>
    )
  } else if (phase === "future-self-generating") {
    content = (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
        <VibiMascot state="thinking" size={140} />
        <p className="cc-label-tech text-sm text-[var(--cc-secondary)]">{generatingMessage}</p>
      </div>
    )
  } else if (phase === "future-self-reveal") {
    const aspiration = FUTURE_SELF_ASPIRATIONS.find((a) => a.value === form.getValues("futureSelfAspiration"))
    content = (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
        <VibiMascot state="celebrate" size={120} />
        <div className="cc-glass-panel w-full max-w-xs rounded-2xl p-8">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[rgba(221,183,255,0.1)] text-[var(--cc-primary)]">
            <MaterialIcon name={aspiration?.icon ?? "auto_awesome"} className="text-[32px]" />
          </div>
          <h2 className="cc-headline mt-3 text-xl font-bold text-[var(--cc-on-surface)]">
            {aspiration?.label ?? "Your Future Self"}
          </h2>
          <p className="mt-1 text-sm text-[var(--cc-on-surface-variant)]">{form.getValues("fullName")}</p>
          <p className="mt-4 text-xs text-[var(--cc-on-surface-variant)]">
            Full AI-generated souvenir coming soon — this is a preview of what you picked.
          </p>
        </div>
        <Button
          onClick={() => goTo("looking-for", 1)}
          className="cc-neon-primary h-14 w-full max-w-xs rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
          size="lg"
        >
          Continue
        </Button>
      </div>
    )
  } else if (phase === "finding-tribe") {
    content = (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
        <VibiMascot state="thinking" size={140} />
        <p className="cc-label-tech text-sm text-[var(--cc-secondary)]">{findingTribeMessage}</p>
      </div>
    )
  } else {
    content = (
      <div className="flex flex-1 flex-col">
        <OnboardingTopBar />

        <div className="flex flex-1 flex-col gap-4 pt-4">
          {isDataStep && (
            <div className="flex flex-col gap-2">
              <div className="flex items-end justify-between">
                <span className="cc-label-tech text-[11px] uppercase tracking-widest text-[var(--cc-secondary)]">
                  Onboarding Protocol
                </span>
                <span className="cc-label-tech text-[11px] text-[var(--cc-primary)]">
                  STEP {stepIndex + 1}/{STEP_ORDER.length}
                </span>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--cc-surface-highest)]">
                <div
                  className="relative h-full rounded-full bg-gradient-to-r from-[var(--cc-primary)] to-[var(--cc-secondary)] transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                >
                  <div className="absolute top-0 right-0 h-full w-2 bg-white/60 blur-[2px]" />
                </div>
              </div>
              <p className="cc-label-tech text-[11px] text-[var(--cc-on-surface-variant)]">
                {stepsRemaining === 0 ? "Last step" : stepsRemaining === 1 ? "1 step to go" : `${stepsRemaining} steps to go`}
              </p>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-1 flex-col gap-5">
            <StepCard
              stepKey={phase}
              direction={direction}
              className="cc-glass-panel border-0 bg-transparent text-[var(--cc-on-surface)] shadow-none"
            >
              {phase === "name" && (
                <>
                  <div className="mb-2 flex justify-center">
                    <VibiMascot state="wave" size={120} />
                  </div>
                  <div className="mb-4 flex items-center justify-center gap-2">
                    <span className="h-px w-6 bg-[var(--cc-primary)]" />
                    <span className="cc-label-tech text-[11px] tracking-widest text-[var(--cc-primary)]/80 uppercase">
                      Identity Matrix
                    </span>
                  </div>
                  <h1 className="cc-headline mb-6 text-center text-2xl font-bold text-[var(--cc-on-surface)]">
                    What&apos;s your name?
                  </h1>
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Full name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter full name"
                            autoFocus
                            className="cc-underline-input h-auto rounded-none border-0 border-b-2 border-[var(--cc-outline-variant)] bg-transparent px-0 py-4 text-xl focus-visible:border-[var(--cc-secondary)] focus-visible:ring-0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="mt-4 text-sm text-[var(--cc-on-surface-variant)]/60">
                    This is how you&apos;ll appear to other entrepreneurs.
                  </p>
                  <div className="mt-8 flex items-center gap-2 text-[var(--cc-secondary)]/70">
                    <MaterialIcon name="info" className="text-[16px]" />
                    <p className="cc-label-tech text-[11px] tracking-tighter uppercase">Encrypted connection active</p>
                  </div>
                </>
              )}

              {phase === "company" && (
                <>
                  <div className="mb-2 flex justify-center">
                    <VibiMascot state="idle" size={120} />
                  </div>
                  <div className="mb-4 flex items-center justify-center gap-2">
                    <span className="h-px w-6 bg-[var(--cc-primary)]" />
                    <span className="cc-label-tech text-[11px] tracking-widest text-[var(--cc-primary)]/80 uppercase">
                      Professional Node
                    </span>
                  </div>
                  <h1 className="cc-headline mb-6 text-center text-2xl font-bold text-[var(--cc-on-surface)]">
                    Where do you work?
                  </h1>
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Company</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Your startup or company"
                            autoFocus
                            className="cc-underline-input h-auto rounded-none border-0 border-b-2 border-[var(--cc-outline-variant)] bg-transparent px-0 py-4 text-xl focus-visible:border-[var(--cc-secondary)] focus-visible:ring-0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="mt-4 text-sm text-[var(--cc-on-surface-variant)]/60">
                    Helps other entrepreneurs know your business at a glance.
                  </p>
                  <div className="mt-8 flex items-center gap-2 text-[var(--cc-secondary)]/70">
                    <MaterialIcon name="info" className="text-[16px]" />
                    <p className="cc-label-tech text-[11px] tracking-tighter uppercase">Encrypted connection active</p>
                  </div>
                </>
              )}

              {phase === "designation" && (
                <>
                  <div className="mb-2 flex justify-center">
                    <VibiMascot state="idle" size={120} />
                  </div>
                  <div className="mb-4 flex items-center justify-center gap-2">
                    <span className="h-px w-6 bg-[var(--cc-primary)]" />
                    <span className="cc-label-tech text-[11px] tracking-widest text-[var(--cc-primary)]/80 uppercase">
                      Strategic Designation
                    </span>
                  </div>
                  <h1 className="cc-headline mb-6 text-center text-2xl font-bold text-[var(--cc-on-surface)]">
                    What&apos;s your role?
                  </h1>
                  <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Designation</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Founder, CEO, Product Lead..."
                            autoFocus
                            className="cc-underline-input h-auto rounded-none border-0 border-b-2 border-[var(--cc-outline-variant)] bg-transparent px-0 py-4 text-xl focus-visible:border-[var(--cc-secondary)] focus-visible:ring-0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="mt-4 text-sm text-[var(--cc-on-surface-variant)]/60">
                    Lets people know who they&apos;re talking to.
                  </p>
                  <div className="mt-8 flex items-center gap-2 text-[var(--cc-secondary)]/70">
                    <MaterialIcon name="info" className="text-[16px]" />
                    <p className="cc-label-tech text-[11px] tracking-tighter uppercase">Encrypted connection active</p>
                  </div>
                </>
              )}

              {phase === "city" && (
                <>
                  <div className="mb-2 flex justify-center">
                    <VibiMascot state="idle" size={120} />
                  </div>
                  <div className="mb-4 flex items-center justify-center gap-2">
                    <span className="h-px w-6 bg-[var(--cc-primary)]" />
                    <span className="cc-label-tech text-[11px] tracking-widest text-[var(--cc-primary)]/80 uppercase">
                      Geospatial Coordinates
                    </span>
                  </div>
                  <h1 className="cc-headline mb-6 text-center text-2xl font-bold text-[var(--cc-on-surface)]">
                    Where are you based?
                  </h1>
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">City</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Chennai, Bengaluru..."
                            autoFocus
                            className="cc-underline-input h-auto rounded-none border-0 border-b-2 border-[var(--cc-outline-variant)] bg-transparent px-0 py-4 text-xl focus-visible:border-[var(--cc-secondary)] focus-visible:ring-0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="mt-4 text-sm text-[var(--cc-on-surface-variant)]/60">
                    Helps us connect you with people nearby.
                  </p>
                  <div className="mt-8 flex items-center gap-2 text-[var(--cc-secondary)]/70">
                    <MaterialIcon name="info" className="text-[16px]" />
                    <p className="cc-label-tech text-[11px] tracking-tighter uppercase">Encrypted connection active</p>
                  </div>
                </>
              )}

              {phase === "industry" && (
                <>
                  <h1 className="cc-headline mb-1 text-xl font-bold text-[var(--cc-on-surface)]">
                    What industry are you in?
                  </h1>
                  <p className="mb-4 text-sm text-[var(--cc-on-surface-variant)]">Tap to select yours.</p>
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ChoiceGrid options={INDUSTRY_OPTIONS} value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch("industry") === "other" && (
                    <FormField
                      control={form.control}
                      name="industryOther"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel className="sr-only">Your industry</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Tell us what industry you're in"
                              autoFocus
                              className="cc-underline-input h-auto rounded-none border-0 border-b-2 border-[var(--cc-outline-variant)] bg-transparent px-0 py-3 text-lg focus-visible:border-[var(--cc-secondary)] focus-visible:ring-0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}

              {phase === "stage" && (
                <>
                  <h1 className="cc-headline mb-1 text-xl font-bold text-[var(--cc-on-surface)]">
                    What stage is your business at?
                  </h1>
                  <p className="mb-4 text-sm text-[var(--cc-on-surface-variant)]">Tap to select yours.</p>
                  <FormField
                    control={form.control}
                    name="businessStage"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ChoiceGrid options={BUSINESS_STAGES} value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {phase === "future-self-pick" && (
                <>
                  {mode === "create" && (
                    <VibiSpeech text="Before we introduce you to other entrepreneurs, let's imagine your future." />
                  )}
                  <h1 className="cc-headline mb-1 text-xl font-bold text-[var(--cc-on-surface)]">
                    Pick your future self
                  </h1>
                  <p className="mb-4 text-sm text-[var(--cc-on-surface-variant)]">
                    Tap to choose your Vibe Corner souvenir.
                  </p>

                  <FormField
                    control={form.control}
                    name="futureSelfAspiration"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ChoiceGrid
                            options={FUTURE_SELF_ASPIRATIONS}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {phase === "looking-for" && (
                <>
                  {mode === "create" && <VibiSpeech text="Awesome! Now let's help you meet the right people." />}
                  <h1 className="cc-headline mb-1 text-xl font-bold text-[var(--cc-on-surface)]">
                    What are you looking for today?
                  </h1>
                  <p className="mb-4 text-sm text-[var(--cc-on-surface-variant)]">Pick up to 6.</p>
                  <FormField
                    control={form.control}
                    name="lookingFor"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <TagToggleGroup options={TAGS} value={field.value} onChange={field.onChange} max={6} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {phase === "can-help" && (
                <>
                  <h1 className="cc-headline mb-1 text-xl font-bold text-[var(--cc-on-surface)]">
                    What can you help others with?
                  </h1>
                  <p className="mb-4 text-sm text-[var(--cc-on-surface-variant)]">
                    These answers power your recommended connections. Pick up to 6.
                  </p>
                  <FormField
                    control={form.control}
                    name="canHelpWith"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <TagToggleGroup options={TAGS} value={field.value} onChange={field.onChange} max={6} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {phase === "challenge" && (
                <>
                  {mode === "create" && (
                    <VibiSpeech text="Every entrepreneur has one challenge they're trying to solve. Let's find people who can help." />
                  )}
                  <h1 className="cc-headline mb-4 flex items-start gap-2 text-lg leading-snug font-bold text-[var(--cc-on-surface)]">
                    <MaterialIcon name="auto_awesome" className="mt-0.5 shrink-0 text-[20px] text-[var(--cc-tertiary)]" />
                    What&apos;s the one thing that, if solved today, would make this event a success for you?
                  </h1>
                  <div className="flex flex-col gap-5">
                    <FormField
                      control={form.control}
                      name="biggestChallenge"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="e.g. Looking for distributors in South India, need AI automation for manufacturing..."
                              rows={4}
                              autoFocus
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="challengeCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="cc-label-tech text-[11px] tracking-widest text-[var(--cc-on-surface-variant)] uppercase">
                            Category (optional)
                          </FormLabel>
                          <FormControl>
                            <ChoiceGrid
                              options={CHALLENGE_CATEGORY_OPTIONS}
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </StepCard>

            <div className="sticky bottom-0 z-40 -mx-4 mt-auto flex gap-3 border-t border-white/10 bg-[var(--cc-surface)]/85 px-4 py-4 backdrop-blur-xl">
              {phase !== "name" && (
                <Button
                  type="button"
                  aria-label="Back"
                  onClick={() => {
                    const prev = STEP_ORDER[stepIndex - 1]
                    if (prev) goTo(prev, -1)
                  }}
                  className="cc-glass-panel size-14 shrink-0 rounded-xl p-0 text-[var(--cc-on-surface)] active:scale-90"
                >
                  <MaterialIcon name="arrow_back" className="text-[20px]" />
                </Button>
              )}

              {phase === "name" && (
                <Button
                  type="button"
                  onClick={() => validateAndAdvance(["fullName"], "company")}
                  className="cc-neon-primary h-14 flex-1 gap-1.5 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
                >
                  Next <MaterialIcon name="arrow_forward" className="text-[18px]" />
                </Button>
              )}
              {phase === "company" && (
                <Button
                  type="button"
                  onClick={() => validateAndAdvance(["company"], "designation")}
                  className="cc-neon-primary h-14 flex-1 gap-1.5 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
                >
                  Next <MaterialIcon name="arrow_forward" className="text-[18px]" />
                </Button>
              )}
              {phase === "designation" && (
                <Button
                  type="button"
                  onClick={() => validateAndAdvance(["designation"], "city")}
                  className="cc-neon-primary h-14 flex-1 gap-1.5 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
                >
                  Next <MaterialIcon name="arrow_forward" className="text-[18px]" />
                </Button>
              )}
              {phase === "city" && (
                <Button
                  type="button"
                  onClick={() => validateAndAdvance(["city"], "industry")}
                  className="cc-neon-primary h-14 flex-1 gap-1.5 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
                >
                  Next <MaterialIcon name="arrow_forward" className="text-[18px]" />
                </Button>
              )}
              {phase === "industry" && (
                <Button
                  type="button"
                  onClick={() => validateAndAdvance(["industry", "industryOther"], "stage")}
                  className="cc-neon-primary h-14 flex-1 gap-1.5 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
                >
                  Next <MaterialIcon name="arrow_forward" className="text-[18px]" />
                </Button>
              )}
              {phase === "stage" && (
                <Button
                  type="button"
                  onClick={() =>
                    validateAndAdvance(["businessStage"], mode === "create" ? "future-self-pick" : "looking-for")
                  }
                  className="cc-neon-primary h-14 flex-1 gap-1.5 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
                >
                  Next <MaterialIcon name="arrow_forward" className="text-[18px]" />
                </Button>
              )}
              {phase === "future-self-pick" && (
                <Button
                  type="button"
                  disabled={!form.watch("futureSelfAspiration")}
                  onClick={() => goTo("future-self-generating", 1)}
                  className="cc-neon-primary h-14 flex-1 gap-1.5 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
                >
                  Reveal My Future <MaterialIcon name="arrow_forward" className="text-[18px]" />
                </Button>
              )}
              {phase === "looking-for" && (
                <Button
                  type="button"
                  onClick={() => validateAndAdvance(["lookingFor"], "can-help")}
                  className="cc-neon-primary h-14 flex-1 gap-1.5 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
                >
                  Next <MaterialIcon name="arrow_forward" className="text-[18px]" />
                </Button>
              )}
              {phase === "can-help" && (
                <Button
                  type="button"
                  onClick={() => validateAndAdvance(["canHelpWith"], "challenge")}
                  className="cc-neon-primary h-14 flex-1 gap-1.5 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
                >
                  Next <MaterialIcon name="arrow_forward" className="text-[18px]" />
                </Button>
              )}
              {phase === "challenge" && (
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={() => (mode === "create" ? goTo("finding-tribe", 1) : finish())}
                  className="cc-neon-primary h-14 flex-1 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
                >
                  {submitting ? "Saving..." : mode === "create" ? "Find My Tribe" : "Save Changes"}
                </Button>
              )}
            </div>
          </form>
          </Form>
        </div>
      </div>
    )
  }

  return (
    <div className="cc-scope -mx-4 flex flex-1 flex-col bg-[var(--cc-surface)] px-4 pt-6 pb-8">
      <CyberConclaveFonts />
      {content}
    </div>
  )
}
