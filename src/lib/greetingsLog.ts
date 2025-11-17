/**
 * Helper functions for logging greetings to the database
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface GreetingLog {
  id: string
  message_type: 'email' | 'sms' | 'whatsapp'
  client_name: string
  client_contact: string
  message_content: string
  delivery_status: 'success' | 'failed'
  error_message: string | null
  created_at: string
  created_by: string | null
}

export interface GreetingLogInsert {
  message_type: 'email' | 'sms' | 'whatsapp'
  client_name: string
  client_contact: string
  message_content: string
  delivery_status: 'success' | 'failed'
  error_message?: string | null
  created_by?: string | null
}

/**
 * Log a greeting message to the database
 */
export async function logGreeting(
  supabase: SupabaseClient,
  log: GreetingLogInsert
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('greetings_log')
      .insert([log])

    if (error) {
      console.error('[GreetingsLog] Error logging greeting:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('[GreetingsLog] Exception logging greeting:', error)
    return { success: false, error: error.message || 'Failed to log greeting' }
  }
}

/**
 * Log multiple greetings in a batch
 */
export async function logGreetingsBatch(
  supabase: SupabaseClient,
  logs: GreetingLogInsert[]
): Promise<{ success: boolean; error?: string; logged: number }> {
  try {
    if (logs.length === 0) {
      return { success: true, logged: 0 }
    }

    const { error } = await supabase
      .from('greetings_log')
      .insert(logs)

    if (error) {
      console.error('[GreetingsLog] Error logging greetings batch:', error)
      return { success: false, error: error.message, logged: 0 }
    }

    return { success: true, logged: logs.length }
  } catch (error: any) {
    console.error('[GreetingsLog] Exception logging greetings batch:', error)
    return { success: false, error: error.message || 'Failed to log greetings', logged: 0 }
  }
}

/**
 * Fetch greetings logs with optional filters
 */
export async function fetchGreetingsLogs(
  supabase: SupabaseClient,
  options?: {
    limit?: number
    messageType?: 'email' | 'sms' | 'whatsapp'
    deliveryStatus?: 'success' | 'failed'
    orderBy?: 'created_at' | 'client_name'
    orderDirection?: 'asc' | 'desc'
  }
): Promise<{ data: GreetingLog[] | null; error: string | null }> {
  try {
    let query = supabase
      .from('greetings_log')
      .select('*')

    // Apply filters
    if (options?.messageType) {
      query = query.eq('message_type', options.messageType)
    }

    if (options?.deliveryStatus) {
      query = query.eq('delivery_status', options.deliveryStatus)
    }

    // Apply ordering
    const orderBy = options?.orderBy || 'created_at'
    const orderDirection = options?.orderDirection || 'desc'
    query = query.order(orderBy, { ascending: orderDirection === 'asc' })

    // Apply limit
    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      // Check if table doesn't exist (common during initial setup)
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        console.warn('[GreetingsLog] Table greetings_log does not exist yet. Please run the SQL migration to create it.')
        return { data: [], error: null } // Return empty array instead of error to prevent UI breakage
      }
      console.error('[GreetingsLog] Error fetching logs:', error)
      return { data: null, error: error.message }
    }

    return { data: data as GreetingLog[], error: null }
  } catch (error: any) {
    // Check if table doesn't exist (common during initial setup)
    const errorMessage = error.message || String(error)
    if (error.code === '42P01' || errorMessage.includes('does not exist') || errorMessage.includes('schema cache')) {
      console.warn('[GreetingsLog] Table greetings_log does not exist yet. Please run the SQL migration to create it.')
      return { data: [], error: null } // Return empty array instead of error to prevent UI breakage
    }
    console.error('[GreetingsLog] Exception fetching logs:', error)
    return { data: null, error: errorMessage || 'Failed to fetch logs' }
  }
}

