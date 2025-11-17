/**
 * React hook to fetch greetings logs from the database
 * Supports filtering by type and status
 */

import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { fetchGreetingsLogs, type GreetingLog } from '@/lib/greetingsLog'

export interface UseGreetingsLogOptions {
  limit?: number
  messageType?: 'email' | 'sms' | 'whatsapp'
  deliveryStatus?: 'success' | 'failed'
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useGreetingsLog(options: UseGreetingsLogOptions = {}) {
  const { supabase } = useSupabase()
  const [logs, setLogs] = useState<GreetingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const {
    limit = 50,
    messageType,
    deliveryStatus,
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
  } = options

  const loadLogs = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await fetchGreetingsLogs(supabase, {
        limit,
        messageType,
        deliveryStatus,
        orderBy: 'created_at',
        orderDirection: 'desc',
      })

      if (fetchError) {
        // If table doesn't exist, just set empty logs instead of throwing
        if (fetchError.includes('does not exist') || fetchError.includes('schema cache')) {
          console.warn('[useGreetingsLog] Table greetings_log does not exist yet. Showing empty history.')
          setLogs([])
        } else {
          throw new Error(fetchError)
        }
      } else {
        setLogs(data || [])
      }
    } catch (err) {
      console.error('[useGreetingsLog] Error loading logs:', err)
      setError(err instanceof Error ? err : new Error('Failed to load greetings logs'))
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  // Load logs on mount and when options change
  useEffect(() => {
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, limit, messageType, deliveryStatus])

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh || !supabase) return

    const interval = setInterval(() => {
      loadLogs()
    }, refreshInterval)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshInterval, supabase])

  return {
    logs,
    loading,
    error,
    refetch: loadLogs,
  }
}

