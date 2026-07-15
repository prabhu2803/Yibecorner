"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CyberConclaveFonts } from "@/components/shared/CyberConclaveFonts"
import { VibiMascot } from "@/features/vibi/VibiMascot"
import { createClient } from "@/lib/supabase/client"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setSubmitting(false)
      toast.error(error.message)
      return
    }

    // Correct credentials but not an admin account: proxy.ts would bounce
    // this straight back to /admin/login with zero explanation, which
    // just looks broken. Catch it here instead, with a real message.
    if (data.user?.app_metadata?.role !== "admin") {
      await supabase.auth.signOut()
      setSubmitting(false)
      toast.error("This account doesn't have admin access.")
      return
    }

    router.replace("/admin")
    router.refresh()
  }

  return (
    <div className="cc-scope cc-admin-base cc-grid-bg relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--cc-surface)] p-6">
      <CyberConclaveFonts />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-[var(--cc-primary)]/20 blur-[100px]" />
        <div className="absolute -right-32 -bottom-32 size-96 rounded-full bg-[var(--cc-secondary)]/20 blur-[100px]" />
      </div>
      <div className="cc-glass-panel relative w-full max-w-sm rounded-3xl p-8 text-center">
        <div className="flex justify-center">
          <VibiMascot state="wave" size={120} />
        </div>
        <h1 className="cc-headline mt-4 text-2xl font-bold text-[var(--cc-on-surface)]">Vibe Corner Admin</h1>
        <p className="mt-2 text-sm text-[var(--cc-on-surface-variant)]">Sign in to manage your event.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex w-full flex-col gap-3 text-left">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-xs text-[var(--cc-on-surface-variant)]">
              Email
            </Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-xs text-[var(--cc-on-surface-variant)]">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            size="lg"
            className="cc-neon-primary mt-2 h-14 rounded-xl bg-gradient-to-r from-[var(--cc-primary-container)] to-[var(--cc-secondary-container)] text-[var(--cc-on-primary)]"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  )
}
