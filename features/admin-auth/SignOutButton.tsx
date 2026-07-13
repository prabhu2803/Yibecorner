"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/admin/login")
    router.refresh()
  }

  return (
    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={handleSignOut}>
      <LogOut className="size-4" />
      Sign out
    </Button>
  )
}
