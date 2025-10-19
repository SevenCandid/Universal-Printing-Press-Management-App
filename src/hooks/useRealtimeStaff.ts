'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function useRealtimeStaff() {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStaff() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .in('role', ['staff', 'manager']) // ✅ Only staff & managers
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching staff:', error)
        setError(error.message)
      } else {
        setStaff(data || [])
      }

      setLoading(false)
    }

    fetchStaff()

    // ✅ Realtime listener for profile updates
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchStaff()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { staff, loading, error }
}
