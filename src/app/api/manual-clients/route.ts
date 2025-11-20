/**
 * API Route for managing manual clients
 * GET: Fetch all manual clients
 * POST: Add a new manual client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { fetchManualClients, addManualClient, type ManualClientInsert } from '@/lib/manualClients'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data, error } = await fetchManualClients(supabase)

    if (error) {
      return NextResponse.json(
        { success: false, error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('Error fetching manual clients:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch manual clients',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, notes } = body

    if (!name || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and phone are required' },
        { status: 400 }
      )
    }

    // Basic validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 7) {
      return NextResponse.json(
        { success: false, error: 'Phone number must have at least 7 digits' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const clientData: ManualClientInsert = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      notes: notes?.trim() || null,
    }

    const result = await addManualClient(supabase, clientData)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error: any) {
    console.error('Error adding manual client:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to add manual client',
      },
      { status: 500 }
    )
  }
}





