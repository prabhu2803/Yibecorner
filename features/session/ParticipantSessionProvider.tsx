"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { VibiMascot } from "@/features/vibi/VibiMascot"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database.types"

type EventRow = Database["public"]["Tables"]["events"]["Row"]
type ParticipantRow = Database["public"]["Tables"]["event_participants"]["Row"]
type ContactsRow = Database["public"]["Tables"]["participant_contacts"]["Row"]

interface ParticipantSessionValue {
  event: EventRow
  userId: string | null
  participant: ParticipantRow | null
  /** Mobile/WhatsApp numbers — null until the participant has saved them.
   *  Lives in its own table (see 0016_add_participant_contacts.sql) since
   *  event_participants has a public select policy and these must not. */
  contacts: ContactsRow | null
  loading: boolean
  refetchParticipant: () => Promise<void>
  /**
   * Sign out and navigate to `redirectTo` (default "/"). Deliberately
   * routed through the provider rather than called inline by consumers
   * (e.g. ProfileForm) — this component's own `if (loading) return
   * <spinner>` below unmounts `children` entirely while the fresh
   * anonymous session re-establishes, so any "don't redirect to
   * onboarding, we're signing out" flag kept in a child component (a
   * ref, state) gets wiped out by that remount. The flag has to live
   * here, in the component that actually survives the loading toggle.
   */
  signOut: (redirectTo?: string) => Promise<void>
  /** True from the moment `signOut()` is called until this provider
   *  unmounts for real (a genuine route change away from /join/[eventSlug],
   *  not just this loading toggle). Consumers' own "no participant ->
   *  redirect to onboarding" effects should skip firing while this is
   *  true, since the fresh anonymous session SIGNED_OUT re-establishes
   *  legitimately has no participant either. */
  isSigningOutRef: React.RefObject<boolean>
}

const ParticipantSessionContext = React.createContext<ParticipantSessionValue | null>(null)

/**
 * Bootstraps an anonymous Supabase session on first visit (so onboarding
 * never shows a login screen — see design.md) and resolves whether the
 * signed-in user already has an event_participants row for this event.
 */
export function ParticipantSessionProvider({
  event,
  children,
}: {
  event: EventRow
  children: React.ReactNode
}) {
  const router = useRouter()
  const [userId, setUserId] = React.useState<string | null>(null)
  const [participant, setParticipant] = React.useState<ParticipantRow | null>(null)
  const [contacts, setContacts] = React.useState<ContactsRow | null>(null)
  const [loading, setLoading] = React.useState(true)
  // A ref, not state — this provider's own `if (loading) return <spinner>`
  // below unmounts `children` (e.g. ProfileForm) while SIGNED_OUT's fresh
  // anonymous session re-establishes, so any equivalent flag kept in a
  // child component gets wiped out by that remount. This ref lives on the
  // provider itself, which is never unmounted, only its render toggles.
  const isSigningOutRef = React.useRef(false)

  const fetchParticipant = React.useCallback(
    async (uid: string) => {
      const supabase = createClient()
      const { data } = await supabase
        .from("event_participants")
        .select("*")
        .eq("event_id", event.id)
        .eq("user_id", uid)
        .maybeSingle()
      setParticipant(data)

      if (data) {
        const { data: contactsData } = await supabase
          .from("participant_contacts")
          .select("*")
          .eq("participant_id", data.id)
          .maybeSingle()
        setContacts(contactsData)
      } else {
        setContacts(null)
      }
    },
    [event.id]
  )

  React.useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function establishAnonymousSession(): Promise<string | null> {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      let uid = session?.user?.id ?? null
      if (!uid) {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) throw error
        uid = data.user?.id ?? null
      }
      return uid
    }

    void (async () => {
      const uid = await establishAnonymousSession()
      if (cancelled) return
      setUserId(uid)
      if (uid) await fetchParticipant(uid)
      if (!cancelled) setLoading(false)
    })()

    // This provider is mounted once at the (app) layout level and never
    // remounts on client-side navigation — so signOut() (e.g. the Sign Out
    // button in ProfileForm) clears the cookie but leaves this component's
    // in-memory `participant`/`userId` state stale unless we react to the
    // auth event ourselves. On SIGNED_OUT, clear that state and immediately
    // re-establish a fresh anonymous identity, mirroring first load.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setParticipant(null)
        setContacts(null)
        setUserId(null)
        setLoading(true)
        void (async () => {
          const uid = await establishAnonymousSession()
          if (cancelled) return
          setUserId(uid)
          if (uid) await fetchParticipant(uid)
          if (!cancelled) setLoading(false)
        })()
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [fetchParticipant])

  const refetchParticipant = React.useCallback(async () => {
    if (userId) await fetchParticipant(userId)
  }, [userId, fetchParticipant])

  const signOut = React.useCallback(
    async (redirectTo: string = "/") => {
      isSigningOutRef.current = true
      const supabase = createClient()
      await supabase.auth.signOut()
      router.replace(redirectTo)
      router.refresh()
    },
    [router]
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <VibiMascot state="idle" size={96} />
      </div>
    )
  }

  return (
    <ParticipantSessionContext.Provider
      value={{ event, userId, participant, contacts, loading, refetchParticipant, signOut, isSigningOutRef }}
    >
      {children}
    </ParticipantSessionContext.Provider>
  )
}

export function useParticipantSession() {
  const ctx = React.useContext(ParticipantSessionContext)
  if (!ctx) {
    throw new Error("useParticipantSession must be used within ParticipantSessionProvider")
  }
  return ctx
}
