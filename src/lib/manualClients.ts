/**
 * Helper functions for managing manually added clients
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { ClientInfo } from './clientUtils'

export interface ManualClient {
  id: string
  name: string
  email: string
  phone: string
  notes?: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface ManualClientInsert {
  name: string
  email: string
  phone: string
  notes?: string | null
  created_by?: string | null
}

/**
 * Convert ManualClient to ClientInfo format
 */
export function manualClientToClientInfo(client: ManualClient): ClientInfo {
  return {
    name: client.name,
    email: client.email.toLowerCase().trim(),
    phone: client.phone.trim(),
    lastOrderDate: client.created_at,
    totalOrders: 0, // Manual clients don't have orders
  }
}

/**
 * Fetch all manual clients
 */
export async function fetchManualClients(
  supabase: SupabaseClient
): Promise<{ data: ManualClient[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('manual_clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[ManualClients] Error fetching manual clients:', error)
      return { data: [], error: error.message }
    }

    return { data: data || [], error: null }
  } catch (err: any) {
    console.error('[ManualClients] Exception fetching manual clients:', err)
    return { data: [], error: err.message || 'Failed to fetch manual clients' }
  }
}

/**
 * Add a new manual client
 */
export async function addManualClient(
  supabase: SupabaseClient,
  client: ManualClientInsert
): Promise<{ success: boolean; data?: ManualClient; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

    const { data, error } = await supabase
      .from('manual_clients')
      .insert([{
        ...client,
        email: client.email.toLowerCase().trim(),
        phone: client.phone.trim(),
        created_by: userId,
      }])
      .select()
      .single()

    if (error) {
      console.error('[ManualClients] Error adding manual client:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as ManualClient }
  } catch (err: any) {
    console.error('[ManualClients] Exception adding manual client:', err)
    return { success: false, error: err.message || 'Failed to add manual client' }
  }
}

/**
 * Update a manual client
 */
export async function updateManualClient(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Omit<ManualClientInsert, 'created_by'>>
): Promise<{ success: boolean; data?: ManualClient; error?: string }> {
  try {
    const updateData: any = { ...updates }
    if (updates.email) {
      updateData.email = updates.email.toLowerCase().trim()
    }
    if (updates.phone) {
      updateData.phone = updates.phone.trim()
    }
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('manual_clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[ManualClients] Error updating manual client:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as ManualClient }
  } catch (err: any) {
    console.error('[ManualClients] Exception updating manual client:', err)
    return { success: false, error: err.message || 'Failed to update manual client' }
  }
}

/**
 * Delete a manual client
 */
export async function deleteManualClient(
  supabase: SupabaseClient,
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('manual_clients')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[ManualClients] Error deleting manual client:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[ManualClients] Exception deleting manual client:', err)
    return { success: false, error: err.message || 'Failed to delete manual client' }
  }
}



