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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { GlassCard } from "@/components/shared/GlassCard"
import { completeOnboarding } from "@/features/onboarding/actions"
import { onboardingSchema, type OnboardingInput } from "@/features/onboarding/schema"
import { TagToggleGroup } from "@/features/onboarding/TagToggleGroup"
import { useParticipantSession } from "@/features/session/ParticipantSessionProvider"
import { BUSINESS_STAGES, INDUSTRIES, TAGS } from "@/lib/constants"

function formatLabel(slug: string) {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function OnboardingForm({ mode = "create" }: { mode?: "create" | "edit" }) {
  const router = useRouter()
  const { event, participant, refetchParticipant } = useParticipantSession()
  const [submitting, setSubmitting] = React.useState(false)

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      fullName: participant?.full_name ?? "",
      company: participant?.company ?? "",
      industry: participant?.industry as OnboardingInput["industry"] | undefined,
      businessStage: participant?.business_stage,
      lookingFor: (participant?.looking_for as OnboardingInput["lookingFor"]) ?? [],
      canHelpWith: (participant?.can_help_with as OnboardingInput["canHelpWith"]) ?? [],
      biggestChallenge: participant?.biggest_challenge ?? "",
    },
  })

  async function onSubmit(values: OnboardingInput) {
    setSubmitting(true)
    const result = await completeOnboarding(event.id, values)
    setSubmitting(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    await refetchParticipant()
    if (mode === "create") {
      router.replace(`/join/${event.slug}/home`)
    } else {
      toast.success("Profile updated")
    }
  }

  return (
    <GlassCard className="my-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">
          {mode === "create" ? "Tell us about you" : "Edit your profile"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "create"
            ? "Takes under 2 minutes — helps us find your best matches."
            : "Update your details any time — matches are recomputed after saving."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input placeholder="Asha Rao" {...field} />
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
                <FormLabel>Company (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Your startup or company" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {formatLabel(industry)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="businessStage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business stage</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select your stage" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BUSINESS_STAGES.map((stage) => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {stage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lookingFor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Looking for (pick up to 6)</FormLabel>
                <FormControl>
                  <TagToggleGroup options={TAGS} value={field.value} onChange={field.onChange} max={6} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="canHelpWith"
            render={({ field }) => (
              <FormItem>
                <FormLabel>I can help with (pick up to 6)</FormLabel>
                <FormControl>
                  <TagToggleGroup options={TAGS} value={field.value} onChange={field.onChange} max={6} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="biggestChallenge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your biggest business challenge (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g. Finding the right co-founder, raising a seed round..."
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={submitting} className="glow-primary w-full">
            {submitting ? "Saving..." : mode === "create" ? "Complete Profile" : "Save Changes"}
          </Button>
        </form>
      </Form>
    </GlassCard>
  )
}
