/**
 * SMS service types and interfaces
 * Modular design to support multiple SMS providers (Termii, WhatsApp, etc.)
 */

export interface SMSProvider {
  sendSMS(options: SMSOptions): Promise<SMSResult>
  testConnection(): Promise<boolean>
}

export interface SMSOptions {
  to: string | string[]
  message: string
  from?: string
}

export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface SMSTemplate {
  message: string
}

export type SMSProviderType = 'termii' | 'whatsapp' | 'twilio'

