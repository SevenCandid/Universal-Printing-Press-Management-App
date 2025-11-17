/**
 * Termii SMS Provider
 * Reads credentials from TERMII_API_KEY, TERMII_SENDER_ID, and TERMII_BASE_URL environment variables
 */

import type { SMSProvider, SMSOptions, SMSResult } from '../types'

interface TermiiSendSMSResponse {
  message_id?: string
  message?: string
  balance?: number
  user?: string
  code?: string
}

export class TermiiProvider implements SMSProvider {
  private apiKey: string | null = null
  private senderId: string | null = null
  private baseUrl: string | null = null
  private initialized: boolean = false

  private initialize(): void {
    if (this.initialized) {
      return
    }

    this.apiKey = process.env.TERMII_API_KEY
    this.senderId = process.env.TERMII_SENDER_ID || 'N-Alert'
    this.baseUrl = process.env.TERMII_BASE_URL || 'https://v3.api.termii.com'

    if (!this.apiKey) {
      throw new Error(
        'Termii credentials not configured. Please set TERMII_API_KEY environment variable.'
      )
    }

    this.initialized = true
  }

  /**
   * Normalize phone number to international format
   * Termii expects numbers in international format (e.g., 233XXXXXXXXX for Ghana)
   * Supports Ghana (+233) and Nigeria (+234) country codes
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '')

    // If number starts with 0, replace with country code
    // Check if it's Ghana (starts with 0 and 9 digits after) or Nigeria
    if (cleaned.startsWith('0')) {
      // For Ghana: 0XXXXXXXXX -> 233XXXXXXXXX
      // For Nigeria: 0XXXXXXXXX -> 234XXXXXXXXX
      // Default to Ghana (233) based on the phone number format
      if (cleaned.length === 10) {
        // Ghana numbers are typically 10 digits (0 + 9 digits)
        cleaned = '233' + cleaned.substring(1)
      } else if (cleaned.length === 11) {
        // Nigeria numbers are typically 11 digits (0 + 10 digits)
        cleaned = '234' + cleaned.substring(1)
      } else {
        // Default to Ghana
        cleaned = '233' + cleaned.substring(1)
      }
    }
    // If number doesn't start with country code, add it
    else if (!cleaned.startsWith('233') && !cleaned.startsWith('234')) {
      // Default to Ghana (233) for 9-digit numbers
      if (cleaned.length === 9) {
        cleaned = '233' + cleaned
      } else if (cleaned.length === 10) {
        // Could be Nigeria
        cleaned = '234' + cleaned
      }
    }

    return cleaned
  }

  async testConnection(): Promise<boolean> {
    try {
      this.initialize()

      if (!this.apiKey) {
        return false
      }

      // Termii doesn't have a dedicated test endpoint, so we'll just verify credentials are set
      // In production, you might want to send a test SMS to verify
      return true
    } catch (error) {
      console.error('Termii connection test failed:', error)
      return false
    }
  }

  async sendSMS(options: SMSOptions): Promise<SMSResult> {
    try {
      this.initialize()

      if (!this.apiKey || !this.senderId || !this.baseUrl) {
        return {
          success: false,
          error: 'Termii credentials not configured. Please check TERMII_API_KEY, TERMII_SENDER_ID, and TERMII_BASE_URL environment variables.',
        }
      }

      const phoneNumbers = Array.isArray(options.to) ? options.to : [options.to]
      const results: SMSResult[] = []

      // Send SMS to each phone number individually
      // Termii API supports bulk sending, but we'll send individually for better error tracking
      for (const phone of phoneNumbers) {
        try {
          const normalizedPhone = this.normalizePhoneNumber(phone)

          // Termii API endpoint (works for both v2 and v3)
          const response = await fetch(`${this.baseUrl}/api/sms/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              api_key: this.apiKey,
              to: normalizedPhone,
              from: this.senderId,
              sms: options.message,
              type: 'plain', // or 'unicode' for non-English characters
              channel: 'generic', // or 'dnd', 'whatsapp' for WhatsApp
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(
              errorData.message || `Termii API error: ${response.status} ${response.statusText}`
            )
          }

          const data: TermiiSendSMSResponse = await response.json()

          // Termii returns different response formats based on success/failure
          if (data.message_id || data.balance !== undefined) {
            results.push({
              success: true,
              messageId: data.message_id || undefined,
            })
          } else if (data.message) {
            // Error response
            results.push({
              success: false,
              error: data.message,
            })
          } else {
            results.push({
              success: false,
              error: 'Unknown error from Termii API',
            })
          }
        } catch (error: any) {
          // Network error or API error for this specific phone number
          results.push({
            success: false,
            error: error.message || 'Failed to send SMS via Termii',
          })
        }
      }

      // If sending to multiple numbers, return success only if all succeeded
      // For single number, return the single result
      if (phoneNumbers.length === 1) {
        return results[0]
      }

      const allSuccess = results.every((r) => r.success)
      const firstError = results.find((r) => !r.success)?.error

      return {
        success: allSuccess,
        messageId: results[0]?.messageId,
        error: allSuccess ? undefined : firstError || 'Some SMS messages failed to send',
      }
    } catch (error: any) {
      console.error('Termii send error:', error)
      return {
        success: false,
        error: error.message || 'Failed to send SMS via Termii',
      }
    }
  }
}

