'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'

type RoleContextType = {
  role: string | null
  loading: boolean
  setRole: (role: string | null) => void
}

const UserRoleContext = createContext<RoleContextType>({
  role: null,
  loading: true,
  setRole: () => {},
})

export const UserRoleProvider = ({ children }: { children: React.ReactNode }) => {
  const { supabase, session } = useSupabase() // ✅ get Supabase client + session
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRole = async () => {
      if (!session) {
        // No active user session
        setLoading(false)
        return
      }

      // ✅ Fetch current user’s role from Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!error && data?.role) {
        setRole(data.role.toLowerCase())
      }
      setLoading(false)
    }

    fetchRole()
  }, [session, supabase])

  return (
    <UserRoleContext.Provider value={{ role, loading, setRole }}>
      {children}
    </UserRoleContext.Provider>
  )
}

export const useUserRole = () => useContext(UserRoleContext)
