/**
 * API Route for updating and deleting manual clients
 * PUT: Update a manual client
 * DELETE: Delete a manual client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { updateManualClient, deleteManualClient } from '@/lib/manualClients'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, phone, notes } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Validate if email is provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    // Validate if phone is provided
    if (phone) {
      const phoneDigits = phone.replace(/\D/g, '')
      if (phoneDigits.length < 7) {
        return NextResponse.json(
          { success: false, error: 'Phone number must have at least 7 digits' },
          { status: 400 }
        )
      }
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

    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (email !== undefined) updates.email = email.trim()
    if (phone !== undefined) updates.phone = phone.trim()
    if (notes !== undefined) updates.notes = notes?.trim() || null

    const result = await updateManualClient(supabase, id, updates)

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
    console.error('Error updating manual client:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update manual client',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
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

    const result = await deleteManualClient(supabase, id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error('Error deleting manual client:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete manual client',
      },
      { status: 500 }
    )
  }
}

