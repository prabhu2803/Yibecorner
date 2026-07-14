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

export const onboardingSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(100),
    company: z.string().trim().min(2, "Enter where you work").max(120),
    designation: z.string().trim().min(2, "Enter your role").max(120),
    city: z.string().trim().min(2, "Enter your city").max(120),
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
  .superRefine((data, ctx) => {
    if (data.industry === "other" && !data.industryOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tell us your industry",
        path: ["industryOther"],
      })
    }
  })

export type OnboardingInput = z.infer<typeof onboardingSchema>
