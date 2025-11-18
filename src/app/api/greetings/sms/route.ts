/**
 * API Route for sending greeting SMS with batching support
 * POST /api/greetings/sms
 * 
 * Request body:
 * {
 *   contacts: Array<{ phone: string; name: string }>,
 *   message?: string (optional custom template)
 * }
 * 
 * Returns:
 * {
 *   success: boolean,
 *   total: number,
 *   sent: number,
 *   failed: number,
 *   results: Array<{ phone: string; name: string; success: boolean; error?: string }>,
 *   failedContacts: Array<{ phone: string; name: string; error: string }>
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { smsService } from '@/lib/sms/service'
import { replacePlaceholders, type TemplateVariables } from '@/lib/sms/templates'
import { logGreetingsBatch, type GreetingLogInsert } from '@/lib/greetingsLog'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Batch size for controlled concurrency
const BATCH_SIZE = 10

/**
 * Process SMS in batches to avoid timeouts
 */
async function processSMSBatch(
  batch: Array<{ phone: string; name: string }>,
  customMessage?: string
): Promise<Array<{ phone: string; name: string; result: { success: boolean; error?: string }; messageContent: string }>> {
  const results = []
  
  for (const contact of batch) {
    try {
      let result
      let messageContent = ''
      
      if (customMessage) {
        // Use custom message template
        const variables: TemplateVariables = {
          clientName: contact.name,
          companyName: process.env.COMPANY_NAME || 'Universal Printing Press',
          month: new Date().toLocaleString('default', { month: 'long' }),
          year: new Date().getFullYear().toString(),
        }
        
        messageContent = replacePlaceholders(customMessage, variables)
        
        result = await smsService.sendSMS({
          to: contact.phone,
          message: messageContent,
        })
      } else {
        // Use default template
        const variables: TemplateVariables = {
          clientName: contact.name,
          companyName: process.env.COMPANY_NAME || 'Universal Printing Press',
          month: new Date().toLocaleString('default', { month: 'long' }),
          year: new Date().getFullYear().toString(),
        }
        // Get default template for logging
        const { getMonthlyGreetingTemplate } = await import('@/lib/sms/templates')
        const template = getMonthlyGreetingTemplate(variables)
        messageContent = template.message
        
        result = await smsService.sendGreetingSMS(contact.phone, contact.name)
      }
      
      results.push({
        phone: contact.phone,
        name: contact.name,
        result: {
          success: result.success,
          error: result.error,
        },
        messageContent,
      })
    } catch (error: any) {
      results.push({
        phone: contact.phone,
        name: contact.name,
        result: {
          success: false,
          error: error.message || 'Failed to send SMS',
        },
        messageContent: customMessage || '',
      })
    }
  }
  
  return results
}

/**
 * Split array into batches
 */
function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize))
  }
  return batches
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contacts, message } = body

    // Validate input
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No contacts provided. Expected an array of contacts with phone and name.' 
        },
        { status: 400 }
      )
    }

    // Validate contact data
    const validContacts = contacts.filter(
      (contact: any) => 
        contact.phone && 
        contact.name && 
        contact.phone.trim() && 
        contact.name.trim()
    )

    if (validContacts.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid contacts provided. Each contact must have phone and name.' 
        },
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

    // Process contacts in batches
    const batches = createBatches(validContacts, BATCH_SIZE)
    const allResults: Array<{ phone: string; name: string; result: { success: boolean; error?: string }; messageContent: string }> = []

    console.log(`[Greetings API] Processing ${validContacts.length} contacts in ${batches.length} batches of ${BATCH_SIZE}`)

    // Process batches sequentially to avoid overwhelming the service
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(`[Greetings API] Processing batch ${i + 1}/${batches.length} (${batch.length} contacts)`)
      
      const batchResults = await processSMSBatch(batch, message)
      allResults.push(...batchResults)
      
      // Small delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Count successes and failures
    const successCount = allResults.filter((r) => r.result.success).length
    const failureCount = allResults.filter((r) => !r.result.success).length

    // Get failed contacts for reporting
    const failedContacts = allResults
      .filter((r) => !r.result.success)
      .map((r) => ({ 
        phone: r.phone, 
        name: r.name, 
        error: r.result.error || 'Unknown error' 
      }))

    console.log(`[Greetings API] Completed: ${successCount} sent, ${failureCount} failed out of ${validContacts.length} total`)

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
      const logs: GreetingLogInsert[] = allResults.map((r) => ({
        message_type: 'sms',
        client_name: r.name,
        client_contact: r.phone,
        message_content: r.messageContent || 'Default SMS template',
        delivery_status: r.result.success ? 'success' : 'failed',
        error_message: r.result.error || null,
        created_by: userId,
      }))

      // Insert logs in batch
      const logResult = await logGreetingsBatch(supabase, logs)
      if (!logResult.success) {
        console.error('[Greetings API] Failed to log greetings:', logResult.error)
        // Don't fail the request if logging fails
      } else {
        console.log(`[Greetings API] Logged ${logResult.logged} greetings to database`)
      }
    } catch (logError: any) {
      console.error('[Greetings API] Error logging greetings:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      total: validContacts.length,
      sent: successCount,
      failed: failureCount,
      results: allResults.map((r) => ({
        phone: r.phone,
        name: r.name,
        success: r.result.success,
        error: r.result.error,
      })),
      failedContacts,
    })
  } catch (error: any) {
    console.error('[Greetings API] Error sending greeting SMS:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send greeting SMS',
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  try {
    const connectionTest = await smsService.testConnection()
    return NextResponse.json({
      success: connectionTest,
      message: connectionTest
        ? 'SMS service is configured and ready'
        : 'SMS service is not configured. Please check TERMII_API_KEY, TERMII_SENDER_ID, and TERMII_BASE_URL environment variables.',
      batchSize: BATCH_SIZE,
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

