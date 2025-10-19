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

  // ✅ Automatically refresh auth tokens
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
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
