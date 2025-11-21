import { SupabaseClient } from '@supabase/supabase-js'

export type ClientInfo = {
  name: string
  email: string
  phone: string
  lastOrderDate: string
  totalOrders: number
}

/**
 * Fetches unique clients from the orders table
 * 
 * Requirements:
 * - Must have both email AND phone number (ignore rows missing either)
 * - Returns up to 100 most recent unique clients
 * - Deduplicates by email (case-insensitive) - takes the most recent order per email
 * - Automatically extracts from orders table to integrate with management system
 * 
 * @param supabase - Supabase client instance
 * @returns Promise with array of unique client info
 */
/**
 * Validates if an email address is in a valid format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates if a phone number has at least some basic format
 */
function isValidPhone(phone: string): boolean {
  // Remove common phone number characters for validation
  const digitsOnly = phone.replace(/[\s\-\(\)\+]/g, '')
  // At least 7 digits (minimum for a valid phone number)
  return digitsOnly.length >= 7
}

export async function fetchClientsFromOrders(
  supabase: SupabaseClient
): Promise<ClientInfo[]> {
  try {
    // Import tracking start date
    const { TRACKING_START_DATE } = await import('./constants')
    
    // Fetch orders with customer info, ordered by most recent first
    // We fetch more than 100 to account for duplicates, then deduplicate
    // Allow orders with either email OR phone (or both)
    // Exclude October orders - only show orders from November 1st, 2024 onwards
    const { data: orders, error } = await supabase
      .from('orders')
      .select('customer_name, customer_email, customer_phone, created_at')
      .or('customer_email.not.is.null,customer_phone.not.is.null') // At least one must exist
      .gte('created_at', TRACKING_START_DATE.toISOString())
      .order('created_at', { ascending: false })
      .limit(500) // Fetch enough to get 100 unique after deduplication

    if (error) {
      // Check if error is due to missing column
      if (error.message?.includes('customer_email') || error.message?.includes('customer_phone') || error.code === 'PGRST116') {
        console.warn('[ClientUtils] customer_email or customer_phone column may not exist in orders table')
        return []
      }
      console.error('[ClientUtils] Error fetching orders for clients:', error)
      throw error
    }

    if (!orders || orders.length === 0) {
      return []
    }

    // Deduplicate by email (case-insensitive) - keep most recent order per unique email
    // Also track order counts per client
    const clientMap = new Map<string, ClientInfo>()
    const orderCounts = new Map<string, number>()

    for (const order of orders) {
      const email = (order.customer_email || '').toLowerCase().trim()
      const phone = (order.customer_phone || '').trim()
      const name = (order.customer_name || '').trim()
      const orderDate = order.created_at || new Date().toISOString()

      // Skip if missing name
      if (!name || name === '') {
        console.debug('[ClientUtils] Skipping order - missing name:', { customer_name: name, email, phone })
        continue
      }

      // Skip if missing BOTH email AND phone (need at least one for greetings)
      if ((!email || email === '' || !isValidEmail(email)) && 
          (!phone || phone === '' || !isValidPhone(phone))) {
        console.debug('[ClientUtils] Skipping order - missing both valid email and phone:', { 
          customer_name: name,
          has_email: !!email,
          email_valid: email ? isValidEmail(email) : false,
          has_phone: !!phone,
          phone_valid: phone ? isValidPhone(phone) : false
        })
        continue
      }

      // Validate email if provided
      if (email && email !== '' && !isValidEmail(email)) {
        console.debug('[ClientUtils] Skipping order - invalid email format:', { 
          customer_name: name,
          email 
        })
        continue
      }

      // Validate phone if provided
      if (phone && phone !== '' && !isValidPhone(phone)) {
        console.debug('[ClientUtils] Skipping order - invalid phone format:', { 
          customer_name: name,
          phone 
        })
        continue
      }

      // Use email as unique key if available, otherwise use phone
      // This ensures we get one entry per unique email/phone
      const key = email || phone

      // Count total orders for this client
      orderCounts.set(key, (orderCounts.get(key) || 0) + 1)

      // Only add if we haven't seen this client before, or if this order is more recent
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          name,
          email: email || '', // Use empty string if no email
          phone: phone || '', // Use empty string if no phone
          lastOrderDate: orderDate,
          totalOrders: 1,
        })
      } else {
        // Update if this order is more recent
        const existing = clientMap.get(key)!
        const existingDate = new Date(existing.lastOrderDate).getTime()
        const currentDate = new Date(orderDate).getTime()

        if (currentDate > existingDate) {
          existing.name = name
          // Update email/phone if this order has better data
          if (email) existing.email = email
          if (phone) existing.phone = phone
          existing.lastOrderDate = orderDate
        }
        // Always update order count
        existing.totalOrders = orderCounts.get(key) || 1
      }
    }

    // Convert map to array, sort by most recent order date, and limit to 100
    const clients = Array.from(clientMap.values())
      .sort((a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime())
      .slice(0, 100)

    console.log(`[ClientUtils] Extracted ${clients.length} unique clients from ${orders.length} orders`)
    if (clients.length === 0 && orders.length > 0) {
      console.warn('[ClientUtils] ⚠️ No valid clients found! Check console for debug logs above.')
      console.log('[ClientUtils] Sample order data (first 3):', orders.slice(0, 3).map(o => ({
        name: o.customer_name,
        email: o.customer_email,
        phone: o.customer_phone,
        has_email: !!o.customer_email,
        has_phone: !!o.customer_phone,
        email_valid: o.customer_email ? isValidEmail((o.customer_email || '').toLowerCase().trim()) : false,
        phone_valid: o.customer_phone ? isValidPhone((o.customer_phone || '').trim()) : false,
      })))
    }
    return clients
  } catch (error) {
    console.error('[ClientUtils] Error in fetchClientsFromOrders:', error)
    throw error
  }
}

/**
 * Validates if a client has all required information for greetings
 */
export function isValidClient(client: Partial<ClientInfo>): boolean {
  return !!(
    client.name &&
    client.email &&
    client.phone &&
    client.email.trim() &&
    client.phone.trim()
  )
}

