/**
 * WhatsApp service types and interfaces
 * Modular design to support multiple WhatsApp providers (WhatsApp Business API, Twilio, etc.)
 */

export interface WhatsAppProvider {
  sendMessage(options: WhatsAppOptions): Promise<WhatsAppResult>
  testConnection(): Promise<boolean>
}

export interface WhatsAppOptions {
  to: string | string[]
  message: string
  from?: string // Phone number or business account ID
}

export interface WhatsAppResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface WhatsAppTemplate {
  message: string
}

export type WhatsAppProviderType = 'business_api' | 'twilio' | 'meta' // Future providers

