import { z } from "zod"

import { BUSINESS_STAGES, INDUSTRIES, TAGS, type BusinessStageValue, type TagValue } from "@/lib/constants"

const businessStageValues = BUSINESS_STAGES.map((s) => s.value) as unknown as [
  BusinessStageValue,
  ...BusinessStageValue[],
]
const tagValues = TAGS.map((t) => t.value) as unknown as [TagValue, ...TagValue[]]

export const onboardingSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  industry: z.enum(INDUSTRIES, { message: "Pick your industry" }),
  businessStage: z.enum(businessStageValues, { message: "Pick your business stage" }),
  lookingFor: z.array(z.enum(tagValues)).min(1, "Pick at least one").max(6),
  canHelpWith: z.array(z.enum(tagValues)).min(1, "Pick at least one").max(6),
  biggestChallenge: z.string().trim().max(500).optional().or(z.literal("")),
})

export type OnboardingInput = z.infer<typeof onboardingSchema>
