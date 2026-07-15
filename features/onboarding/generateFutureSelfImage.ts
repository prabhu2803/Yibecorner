"use server"

import { randomUUID } from "node:crypto"
import { GoogleGenAI } from "@google/genai"

import { serverEnv } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"

const MODEL = "gemini-2.5-flash-image"

/**
 * Generates the "Future Self" souvenir image shown on the onboarding
 * reveal card. Runs before the participant's event_participants row
 * exists (see OnboardingForm's STEP_ORDER — the DB write only happens at
 * the very end, at "finding-tribe"), so the resulting URL is threaded
 * through the wizard's own state and attached during that later
 * completeOnboarding call rather than looked up by participant id here.
 *
 * Never throws — a missing key, a model failure, or an upload failure all
 * just fall back to `{ success: false }`, and the caller (OnboardingForm)
 * falls back to the existing icon+label placeholder reveal. This is a
 * nice-to-have souvenir, not something onboarding should ever be blocked
 * on.
 */
export async function generateFutureSelfImage(input: {
  designation: string
  company: string
  industry: string
  aspirationLabel: string
  aspirationDescription: string
  /** Raw base64 payload (no "data:...;base64," prefix) from SelfieCapture. */
  selfieBase64?: string
  selfieMimeType?: string
}): Promise<{ success: true; imageUrl: string } | { success: false }> {
  if (!serverEnv.GEMINI_API_KEY) {
    return { success: false }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false }

  try {
    const ai = new GoogleGenAI({ apiKey: serverEnv.GEMINI_API_KEY })

    // Company name is deliberately left out of the prompt: naming it here
    // previously nudged the model into rendering it as a logo/caption
    // (and misspelling it) despite an explicit no-text instruction — image
    // models are unreliable at spelling arbitrary strings. The company
    // name is already shown as a separate HTML caption in the reveal
    // card, so the illustration itself doesn't need to carry it.
    const hasSelfie = Boolean(input.selfieBase64 && input.selfieMimeType)
    const prompt = hasSelfie
      ? `Using the attached photo of this person's face, create a vibrant, inspiring stylized illustrated portrait of them celebrating their future success: ${input.aspirationDescription} They work as a ${input.designation} in the ${input.industry.replace(/_/g, " ")} industry. Keep their likeness recognizable (face shape, skin tone, hair) but render it as a modern flat-design illustration, not a photo. Style: optimistic and celebratory mood, colorful gradient background using purple, cyan, and amber tones, portrait orientation. Absolutely no text, words, letters, numbers, logos, or writing of any kind anywhere in the image — purely visual, no captions or labels.`
      : `A vibrant, inspiring digital illustration celebrating a founder's future success: ${input.aspirationDescription} They work as a ${input.designation} in the ${input.industry.replace(/_/g, " ")} industry. Style: modern flat-design illustration, optimistic and celebratory mood, colorful gradient background using purple, cyan, and amber tones, portrait orientation. Absolutely no text, words, letters, numbers, logos, or writing of any kind anywhere in the image — purely visual, no captions or labels.`

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: hasSelfie
        ? [{ inlineData: { data: input.selfieBase64, mimeType: input.selfieMimeType } }, { text: prompt }]
        : prompt,
    })

    const parts = response.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p) => p.inlineData?.data)
    if (!imagePart?.inlineData?.data) {
      console.error("generateFutureSelfImage: no image data in Gemini response")
      return { success: false }
    }

    const mimeType = imagePart.inlineData.mimeType ?? "image/png"
    const extension = mimeType.split("/")[1] ?? "png"
    const bytes = Buffer.from(imagePart.inlineData.data, "base64")
    const path = `${user.id}/${randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from("future-self-images")
      .upload(path, bytes, { contentType: mimeType })

    if (uploadError) {
      console.error("generateFutureSelfImage: upload failed:", uploadError.message)
      return { success: false }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("future-self-images").getPublicUrl(path)

    return { success: true, imageUrl: publicUrl }
  } catch (err) {
    console.error("generateFutureSelfImage failed:", err)
    return { success: false }
  }
}
