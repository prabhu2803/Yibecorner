"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { AppTopBar } from "@/components/shared/AppTopBar"
import { CyberConclaveFonts } from "@/components/shared/CyberConclaveFonts"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { ChoiceGrid } from "@/features/onboarding/ChoiceGrid"
import { MaterialIcon } from "@/features/onboarding/MaterialIcon"
import { TagToggleGroup } from "@/features/onboarding/TagToggleGroup"
import { VibiMascot } from "@/features/vibi/VibiMascot"
import { completeOnboarding } from "@/features/onboarding/actions"
import { onboardingSchema, phoneRegex, type OnboardingInput } from "@/features/onboarding/schema"
import { useParticipantSession } from "@/features/session/ParticipantSessionProvider"
import { createClient } from "@/lib/supabase/client"
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

const underlineInputClass =
  "cc-underline-input h-auto rounded-none border-0 border-b-2 border-[var(--cc-outline-variant)] bg-transparent px-0 py-3 text-lg focus-visible:border-[var(--cc-secondary)] focus-visible:ring-0"

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="cc-glass-panel flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <span className="h-px w-6 bg-[var(--cc-primary)]" />
        <span className="cc-label-tech text-[11px] tracking-widest text-[var(--cc-primary)]/80 uppercase">
          {label}
        </span>
      </div>
      {children}
    </section>
  )
}

/**
 * Single-page profile view/edit — unlike OnboardingForm (a linear
 * step-by-step wizard meant for first-time setup), this shows every field
 * at once so editing one detail doesn't require walking through all 10
 * steps again. Shares the same schema/action/options as onboarding so
 * validation and persistence never drift between the two.
 */
export function ProfileForm() {
  const router = useRouter()
  const { event, participant, contacts, loading, refetchParticipant } = useParticipantSession()
  const [submitting, setSubmitting] = React.useState(false)
  const initial = (participant?.full_name?.trim()[0] ?? "?").toUpperCase()

  // Profile editing assumes onboarding already ran — a device that lands
  // here first (e.g. a direct link) gets sent through the proper wizard
  // instead of seeing a blank edit form.
  React.useEffect(() => {
    if (!loading && !participant) {
      router.replace(`/join/${event.slug}/onboard`)
    }
  }, [loading, participant, event.slug, router])

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      fullName: participant?.full_name ?? "",
      company: participant?.company ?? "",
      designation: participant?.designation ?? "",
      city: participant?.city ?? "",
      mobileNumber: contacts?.mobile_number ?? "",
      whatsappSameAsMobile: contacts ? contacts.mobile_number === contacts.whatsapp_number : true,
      whatsappNumber: contacts && contacts.mobile_number !== contacts.whatsapp_number ? contacts.whatsapp_number : "",
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

  async function onSave() {
    const valid = await form.trigger()
    if (!valid) {
      toast.error("Please fix the highlighted fields")
      return
    }

    // form.trigger() alone can miss these two conditional-required fields
    // when some other field is still invalid at the same moment — see the
    // comment on onboardingSchema's superRefine in schema.ts. Cheap to
    // double-check manually here too.
    let hasExtraError = false
    if (form.getValues("industry") === "other" && !form.getValues("industryOther")?.trim()) {
      form.setError("industryOther", { type: "manual", message: "Tell us your industry" })
      hasExtraError = true
    }
    if (
      !form.getValues("whatsappSameAsMobile") &&
      !phoneRegex.test(form.getValues("whatsappNumber")?.trim() ?? "")
    ) {
      form.setError("whatsappNumber", { type: "manual", message: "Enter a valid WhatsApp number" })
      hasExtraError = true
    }
    if (hasExtraError) {
      toast.error("Please fix the highlighted fields")
      return
    }

    setSubmitting(true)
    const result = await completeOnboarding(event.id, form.getValues())
    setSubmitting(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    await refetchParticipant()
    toast.success("Profile updated")
  }

  // Anonymous auth means "identity" is this browser session, not a
  // password-protected account — signing out doesn't let you log back in
  // as yourself later. It starts a brand-new anonymous session, which
  // lands back on onboarding; re-entering the same mobile number there
  // re-links this exact profile (see find_or_claim_participant_by_phone).
  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace(`/join/${event.slug}`)
    router.refresh()
  }

  if (loading || !participant) {
    return (
      <div className="-mx-4 flex flex-1 flex-col bg-[var(--cc-surface)]">
        <CyberConclaveFonts />
        <AppTopBar
          homeHref={`/join/${event.slug}/home`}
          profileHref={`/join/${event.slug}/profile`}
          initial={initial}
        />
        <div className="flex flex-1 items-center justify-center">
          <VibiMascot state="thinking" size={96} />
        </div>
      </div>
    )
  }

  return (
    <div className="-mx-4 flex flex-1 flex-col bg-[var(--cc-surface)]">
      <CyberConclaveFonts />
      <AppTopBar homeHref={`/join/${event.slug}/home`} profileHref={`/join/${event.slug}/profile`} initial={initial} />

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4 px-4 py-6">
          <div className="flex items-center gap-4">
            <VibiMascot state="idle" size={64} />
            <div>
              <h1 className="cc-headline text-xl font-bold text-[var(--cc-on-surface)]">My Profile</h1>
              <p className="text-sm text-[var(--cc-on-surface-variant)]">Keep your details up to date.</p>
            </div>
          </div>

          <Section label="Identity Matrix">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-[var(--cc-on-surface-variant)]">Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Asha Rao" className={underlineInputClass} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-[var(--cc-on-surface-variant)]">Company</FormLabel>
                  <FormControl>
                    <Input placeholder="Your startup or company" className={underlineInputClass} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-[var(--cc-on-surface-variant)]">Designation</FormLabel>
                  <FormControl>
                    <Input placeholder="Founder, CEO, Product Lead..." className={underlineInputClass} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-[var(--cc-on-surface-variant)]">City</FormLabel>
                  <FormControl>
                    <Input placeholder="Chennai, Bengaluru..." className={underlineInputClass} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section label="Contact Uplink">
            <FormField
              control={form.control}
              name="mobileNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-[var(--cc-on-surface-variant)]">Mobile number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+91 98765 43210" className={underlineInputClass} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="whatsappSameAsMobile"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      className="data-checked:border-[var(--cc-primary)] data-checked:bg-[var(--cc-primary)]"
                    />
                  </FormControl>
                  <FormLabel className="text-sm text-[var(--cc-on-surface)]">
                    My WhatsApp number is the same as my mobile number
                  </FormLabel>
                </FormItem>
              )}
            />
            {!form.watch("whatsappSameAsMobile") && (
              <FormField
                control={form.control}
                name="whatsappNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-[var(--cc-on-surface-variant)]">WhatsApp number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+91 98765 43210" className={underlineInputClass} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex items-start gap-2 rounded-2xl bg-[rgba(93,230,255,0.06)] p-4 text-[var(--cc-secondary)]">
              <MaterialIcon name="lock" className="mt-0.5 shrink-0 text-[16px]" />
              <p className="text-xs text-[var(--cc-on-surface)]">
                Your contact information remains completely private. It will only be shared after both participants
                mutually agree to exchange contact details.
              </p>
            </div>
          </Section>

          <Section label="Business DNA">
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-[var(--cc-on-surface-variant)]">Industry</FormLabel>
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
                  <FormItem>
                    <FormLabel className="sr-only">Your industry</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Tell us what industry you're in"
                        className={underlineInputClass}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="businessStage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-[var(--cc-on-surface-variant)]">Business stage</FormLabel>
                  <FormControl>
                    <ChoiceGrid options={BUSINESS_STAGES} value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section label="Looking For">
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
          </Section>

          <Section label="Can Help With">
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
          </Section>

          <Section label="Your Challenge">
            <FormField
              control={form.control}
              name="biggestChallenge"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Looking for distributors in South India, need AI automation for manufacturing..."
                      rows={4}
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
                  <FormLabel className="text-xs text-[var(--cc-on-surface-variant)]">Category (optional)</FormLabel>
                  <FormControl>
                    <ChoiceGrid options={CHALLENGE_CATEGORY_OPTIONS} value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section label="Future Self">
            <FormField
              control={form.control}
              name="futureSelfAspiration"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ChoiceGrid options={FUTURE_SELF_ASPIRATIONS} value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section label="Session">
            <p className="text-xs text-[var(--cc-on-surface-variant)]">
              Signing out starts a new session on this device. To resume this exact profile later, enter the same
              mobile number again during onboarding.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleSignOut}
              className="cc-glass-panel w-fit gap-1.5 rounded-xl text-[var(--cc-on-surface-variant)]"
            >
              <MaterialIcon name="logout" className="text-[16px]" />
              Sign out
            </Button>
          </Section>

          <div className="sticky bottom-0 z-40 -mx-4 mt-2 border-t border-white/10 bg-[var(--cc-surface)]/85 px-4 py-4 backdrop-blur-xl">
            <Button
              type="button"
              disabled={submitting}
              onClick={onSave}
              className="cc-neon-primary h-14 w-full gap-1.5 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
            >
              {submitting ? (
                "Saving..."
              ) : (
                <>
                  Save Changes <MaterialIcon name="check" className="text-[18px]" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
