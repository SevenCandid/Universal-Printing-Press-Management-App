/**
 * API Route for sending client greeting emails
 * POST /api/client-connect/send-email
 */

import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email/service'
import { logGreetingsBatch, type GreetingLogInsert } from '@/lib/greetingsLog'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getMonthlyGreetingTemplate } from '@/lib/email/templates'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clients, customTemplate } = body

    if (!clients || !Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No clients provided' },
        { status: 400 }
      )
    }

    // Validate client data
    const validClients = clients.filter(
      (client: any) => client.email && client.name && client.email.trim() && client.name.trim()
    )

    if (validClients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid clients provided' },
        { status: 400 }
      )
    }

    // Test connection first
    const connectionTest = await emailService.testConnection()
    if (!connectionTest) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email service not configured. Please check GMAIL_USER and GMAIL_PASS environment variables.',
        },
        { status: 500 }
      )
    }

    // Send emails to all clients (with custom template if provided)
    const results = await Promise.all(
      validClients.map(async (client: any) => {
        const result = await emailService.sendGreetingEmail(
          client.email.trim(),
          client.name.trim(),
          customTemplate ? { customTemplate } : undefined
        )
        return {
          email: client.email.trim(),
          name: client.name.trim(),
          result,
        }
      })
    )

    // Count successes and failures
    const successCount = results.filter((r) => r.result.success).length
    const failureCount = results.filter((r) => !r.result.success).length

    // Get failed emails for reporting
    const failedEmails = results
      .filter((r) => !r.result.success)
      .map((r) => ({ email: r.email, name: r.name, error: r.result.error }))

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
          let messageContent: string
          if (customTemplate) {
            // Use custom template with placeholder replacement
            const { replacePlaceholders } = await import('@/lib/email/templates')
            messageContent = replacePlaceholders(customTemplate, variables)
          } else {
            // Use default template
            const template = getMonthlyGreetingTemplate(variables)
            messageContent = template.text || template.html.replace(/<[^>]*>/g, '')
          }

          return {
            message_type: 'email',
            client_name: r.name,
            client_contact: r.email,
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
        email: r.email,
        name: r.name,
        success: r.result.success,
        error: r.result.error,
      })),
      failedEmails,
    })
  } catch (error: any) {
    console.error('Error sending greeting emails:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send greeting emails',
      },
      { status: 500 }
    )
  }
}

// Test connection endpoint
export async function GET(request: NextRequest) {
  try {
    const connectionTest = await emailService.testConnection()
    return NextResponse.json({
      success: connectionTest,
      message: connectionTest
        ? 'Email service is configured and ready'
        : 'Email service is not configured. Please check GMAIL_USER and GMAIL_PASS environment variables.',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to test email service',
      },
      { status: 500 }
    )
  }
}







