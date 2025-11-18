import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { fetchClientsFromOrders, type ClientInfo } from '@/lib/clientUtils'

/**
 * React hook to fetch unique clients from orders table
 * 
 * Automatically extracts client names, emails, and phone numbers directly from the orders table.
 * This integrates the greetings system with the management system by using logged order data.
 * 
 * Features:
 * - Automatically loads when Client Connect page initializes
 * - Fetches most recent 100 unique clients
 * - Ignores rows missing either email or phone number
 * - Deduplicates by email (case-insensitive)
 * - Tracks order counts and last order date per client
 * 
 * @returns Object with clients array, loading state, error, and refetch function
 */
export function useClientsFromOrders() {
  const { supabase } = useSupabase()
  const [clients, setClients] = useState<ClientInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadClients = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const clientData = await fetchClientsFromOrders(supabase)
      setClients(clientData)
      
      if (clientData.length > 0) {
        console.log(`[useClientsFromOrders] Loaded ${clientData.length} unique clients from orders table`)
      }
    } catch (err) {
      console.error('[useClientsFromOrders] Error loading clients from orders:', err)
      setError(err instanceof Error ? err : new Error('Failed to load clients'))
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  // Automatically load clients when component mounts and Supabase is available
  useEffect(() => {
    loadClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  return {
    clients,
    loading,
    error,
    refetch: loadClients,
  }
}








