"use client"

import * as React from "react"

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
  const [userId, setUserId] = React.useState<string | null>(null)
  const [participant, setParticipant] = React.useState<ParticipantRow | null>(null)
  const [contacts, setContacts] = React.useState<ContactsRow | null>(null)
  const [loading, setLoading] = React.useState(true)

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <VibiMascot state="idle" size={96} />
      </div>
    )
  }

  return (
    <ParticipantSessionContext.Provider
      value={{ event, userId, participant, contacts, loading, refetchParticipant }}
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
