'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { Session, SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabaseClient'

type SupabaseContextType = {
  supabase: SupabaseClient
  session: Session | null
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export const SupabaseProvider = ({
  children,
  session: initialSession,
}: {
  children: React.ReactNode
  session: Session | null
}) => {
  const [supabase] = useState(() => createSupabaseBrowserClient())
  const [session, setSession] = useState<Session | null>(initialSession)

  useEffect(() => {
    // 🔹 Fetch the current session on mount to prevent "Auth session missing!" errors
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setSession(data.session)
    })

    // 🔹 Keep session updated whenever auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <SupabaseContext.Provider value={{ supabase, session }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (!context) throw new Error('useSupabase must be used inside SupabaseProvider')
  return context
}
