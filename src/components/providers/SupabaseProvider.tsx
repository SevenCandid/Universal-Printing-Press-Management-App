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
    // 🔹 Fetch the current user on mount (secure method)
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        // Get session from auth state change listener instead
        // This is handled by the listener below
      }
    })

    // 🔹 Keep session updated whenever auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state change:', event)
      
      // Handle different auth events
      if (event === 'TOKEN_REFRESHED') {
        console.log('✅ Session token refreshed successfully')
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 User signed out')
      } else if (event === 'SIGNED_IN') {
        console.log('🎉 User signed in')
      }
      
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
