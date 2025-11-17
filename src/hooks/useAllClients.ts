/**
 * React hook that merges clients from orders and manually added clients
 */

import { useState, useEffect, useMemo } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { fetchClientsFromOrders, type ClientInfo } from '@/lib/clientUtils'
import { fetchManualClients, manualClientToClientInfo, type ManualClient } from '@/lib/manualClients'

export function useAllClients() {
  const { supabase } = useSupabase()
  const [clientsFromOrders, setClientsFromOrders] = useState<ClientInfo[]>([])
  const [manualClients, setManualClients] = useState<ManualClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Merge clients from both sources
  const allClients = useMemo(() => {
    // Convert manual clients to ClientInfo format
    const manualAsClientInfo = manualClients.map(manualClientToClientInfo)
    
    // Combine both sources
    const combined = [...clientsFromOrders, ...manualAsClientInfo]
    
    // Helper function to get unique key for a client (email if available, otherwise phone)
    const getClientKey = (client: ClientInfo): string => {
      const email = client.email?.trim().toLowerCase()
      const phone = client.phone?.trim()
      // Use email as key if available, otherwise use phone
      // If neither exists, use name+date as fallback (shouldn't happen in practice)
      return email || phone || `${client.name}-${client.lastOrderDate}`
    }
    
    // Deduplicate - prefer manual clients over orders
    const clientMap = new Map<string, ClientInfo>()
    
    // First add clients from orders
    for (const client of clientsFromOrders) {
      const key = getClientKey(client)
      if (!clientMap.has(key)) {
        clientMap.set(key, client)
      }
    }
    
    // Then add/override with manual clients (manual takes priority)
    for (const client of manualAsClientInfo) {
      const key = getClientKey(client)
      clientMap.set(key, client)
    }
    
    // Sort by last order date (or created date for manual clients)
    return Array.from(clientMap.values()).sort((a, b) => {
      const dateA = new Date(a.lastOrderDate).getTime()
      const dateB = new Date(b.lastOrderDate).getTime()
      return dateB - dateA // Most recent first
    })
  }, [clientsFromOrders, manualClients])

  const loadClients = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Load clients from orders and manual clients in parallel
      const [ordersData, manualData] = await Promise.all([
        fetchClientsFromOrders(supabase),
        fetchManualClients(supabase),
      ])

      setClientsFromOrders(ordersData)
      
      if (manualData.error) {
        console.warn('[useAllClients] Error loading manual clients:', manualData.error)
        setManualClients([])
      } else {
        setManualClients(manualData.data)
      }
    } catch (err) {
      console.error('[useAllClients] Error loading clients:', err)
      setError(err instanceof Error ? err : new Error('Failed to load clients'))
      setClientsFromOrders([])
      setManualClients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  return {
    clients: allClients,
    clientsFromOrders,
    manualClients,
    loading,
    error,
    refetch: loadClients,
  }
}

