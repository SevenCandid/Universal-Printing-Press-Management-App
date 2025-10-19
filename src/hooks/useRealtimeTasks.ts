// src/hooks/useRealtimeTasks.ts
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function useRealtimeTasks() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          orders:order_id (
            id,
            customer_name,
            total_amount
          ),
          staff:assigned_to (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setTasks(data || [])
      }
      setLoading(false)
    }

    fetchTasks()

    const channel = supabase
      .channel('realtime:tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          fetchTasks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { tasks, loading, error }
}
