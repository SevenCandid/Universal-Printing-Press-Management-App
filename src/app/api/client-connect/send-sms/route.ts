/**
 * API Route for sending client greeting SMS
 * POST /api/client-connect/send-sms
 */

import { NextRequest, NextResponse } from 'next/server'
import { smsService } from '@/lib/sms/service'
import { logGreetingsBatch, type GreetingLogInsert } from '@/lib/greetingsLog'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getMonthlyGreetingTemplate } from '@/lib/sms/templates'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clients } = body

    if (!clients || !Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No clients provided' },
        { status: 400 }
      )
    }

    // Validate client data - must have phone and name
    const validClients = clients.filter(
      (client: any) => client.phone && client.name && client.phone.trim() && client.name.trim()
    )

    if (validClients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid clients provided (must have phone and name)' },
        { status: 400 }
      )
    }

    // Test connection first
    const connectionTest = await smsService.testConnection()
    if (!connectionTest) {
      return NextResponse.json(
        {
          success: false,
          error: 'SMS service not configured. Please check TERMII_API_KEY, TERMII_SENDER_ID, and TERMII_BASE_URL environment variables.',
        },
        { status: 500 }
      )
    }

    // Send SMS to all clients
    const results = await smsService.sendBulkGreetingSMS(
      validClients.map((client: any) => ({
        phone: client.phone.trim(),
        name: client.name.trim(),
      }))
    )

    // Count successes and failures
    const successCount = results.filter((r) => r.result.success).length
    const failureCount = results.filter((r) => !r.result.success).length

    // Get failed SMS for reporting
    const failedSMS = results
      .filter((r) => !r.result.success)
      .map((r) => ({ phone: r.phone, name: r.name, error: r.result.error }))

    // Log all greetings to database
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || null

      // Prepare logs for batch insert
      const logs: GreetingLogInsert[] = await Promise.all(
        results.map(async (r) => {
          // Get the message content from template
          const variables = {
            clientName: r.name,
            companyName: process.env.COMPANY_NAME || 'Universal Printing Press',
            month: new Date().toLocaleString('default', { month: 'long' }),
            year: new Date().getFullYear().toString(),
          }
          const template = getMonthlyGreetingTemplate(variables)
          const messageContent = template.message

          return {
            message_type: 'sms',
            client_name: r.name,
            client_contact: r.phone,
            message_content: messageContent,
            delivery_status: r.result.success ? 'success' : 'failed',
            error_message: r.result.error || null,
            created_by: userId,
          }
        })
      )

      // Insert logs in batch
      const logResult = await logGreetingsBatch(supabase, logs)
      if (!logResult.success) {
        console.error('[Client Connect API] Failed to log greetings:', logResult.error)
        // Don't fail the request if logging fails
      } else {
        console.log(`[Client Connect API] Logged ${logResult.logged} greetings to database`)
      }
    } catch (logError: any) {
      console.error('[Client Connect API] Error logging greetings:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      total: validClients.length,
      sent: successCount,
      failed: failureCount,
      results: results.map((r) => ({
        phone: r.phone,
        name: r.name,
        success: r.result.success,
        error: r.result.error,
      })),
      failedSMS,
    })
  } catch (error: any) {
    console.error('Error sending greeting SMS:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send greeting SMS',
      },
      { status: 500 }
    )
  }
}

// Test connection endpoint
export async function GET(request: NextRequest) {
  try {
    const connectionTest = await smsService.testConnection()
    return NextResponse.json({
      success: connectionTest,
      message: connectionTest
        ? 'SMS service is configured and ready'
        : 'SMS service is not configured. Please check TERMII_API_KEY, TERMII_SENDER_ID, and TERMII_BASE_URL environment variables.',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to test SMS service',
      },
      { status: 500 }
    )
  }
}

