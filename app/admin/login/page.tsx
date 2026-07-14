"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuroraBackground } from "@/components/shared/AuroraBackground"
import { GlassCard } from "@/components/shared/GlassCard"
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
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <AuroraBackground />
      <GlassCard className="flex w-full max-w-sm flex-col items-center gap-6">
        <VibiMascot state="idle" size={72} />
        <div className="text-center">
          <h1 className="text-xl font-bold">Vibe Corner Admin</h1>
          <p className="text-sm text-muted-foreground">Sign in to manage your event.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={submitting} className="glow-primary mt-2">
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </GlassCard>
    </div>
  )
}
