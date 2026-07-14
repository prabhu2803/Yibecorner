import { z } from "zod"

import {
  BUSINESS_STAGES,
  CHALLENGE_CATEGORIES,
  INDUSTRIES,
  TAGS,
  type BusinessStageValue,
  type ChallengeCategory,
  type TagValue,
} from "@/lib/constants"

const businessStageValues = BUSINESS_STAGES.map((s) => s.value) as unknown as [
  BusinessStageValue,
  ...BusinessStageValue[],
]
const tagValues = TAGS.map((t) => t.value) as unknown as [TagValue, ...TagValue[]]
const challengeCategoryValues = CHALLENGE_CATEGORIES as unknown as [ChallengeCategory, ...ChallengeCategory[]]

// Permissive on purpose — this only guards against obviously-wrong input
// (letters, too short), not real phone validation. No OTP verification for
// the MVP per spec, so this is the only gate before the number is stored.
// Exported so the wizard's per-step manual cross-field checks (see
// OnboardingForm's validateAndAdvance) can reuse the exact same rule
// instead of duplicating it — see the comment on the superRefine below for
// why those checks can't just rely on this schema's superRefine mid-wizard.
export const phoneRegex = /^[+\d][\d\s\-()]{6,}$/

// Strips everything but digits and a leading "+" so "+91 98765-43210" and
// "+919876543210" compare equal. Used both when writing mobile_number (so
// stored values are consistent) and when looking up an existing participant
// by phone in completeOnboarding — comparisons only work if both sides went
// through the same normalization.
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim()
  const hasPlus = trimmed.startsWith("+")
  const digits = trimmed.replace(/\D/g, "")
  return hasPlus ? `+${digits}` : digits
}

export const onboardingSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(100),
    company: z.string().trim().min(2, "Enter where you work").max(120),
    designation: z.string().trim().min(2, "Enter your role").max(120),
    city: z.string().trim().min(2, "Enter your city").max(120),
    mobileNumber: z.string().trim().regex(phoneRegex, "Enter a valid mobile number"),
    whatsappSameAsMobile: z.boolean(),
    // Only required when whatsappSameAsMobile is false — enforced below via
    // superRefine, mirroring the industryOther pattern.
    whatsappNumber: z.string().trim().optional().or(z.literal("")),
    industry: z.enum(INDUSTRIES, { message: "Pick your industry" }),
    // Only required when industry === "other" — enforced below via
    // superRefine rather than a plain .min(), since it must stay optional
    // for every other industry value.
    industryOther: z.string().trim().max(120).optional().or(z.literal("")),
    businessStage: z.enum(businessStageValues, { message: "Pick your business stage" }),
    lookingFor: z.array(z.enum(tagValues)).min(1, "Pick at least one").max(6),
    canHelpWith: z.array(z.enum(tagValues)).min(1, "Pick at least one").max(6),
    biggestChallenge: z.string().trim().max(500).optional().or(z.literal("")),
    challengeCategory: z.enum(challengeCategoryValues).optional(),
    futureSelfAspiration: z.string().trim().max(60).optional().or(z.literal("")),
  })
  // Zod v4 only runs superRefine when every other field in the object
  // shape has already parsed successfully — mid-wizard, later steps'
  // required fields (industry, businessStage, tags...) are still empty
  // while validating an earlier step, so these checks silently never fire
  // via form.trigger() until the very last step. The wizard therefore
  // duplicates these two conditions as manual checks in OnboardingForm's
  // validateAndAdvance; this superRefine still matters for the final
  // whole-object submit in completeOnboarding, where every field really is
  // populated by then.
  .superRefine((data, ctx) => {
    if (data.industry === "other" && !data.industryOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tell us your industry",
        path: ["industryOther"],
      })
    }
    if (!data.whatsappSameAsMobile && !phoneRegex.test(data.whatsappNumber?.trim() ?? "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid WhatsApp number",
        path: ["whatsappNumber"],
      })
    }
  })

export type OnboardingInput = z.infer<typeof onboardingSchema>
