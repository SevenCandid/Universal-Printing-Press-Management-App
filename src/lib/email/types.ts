/**
 * Email service types and interfaces
 * Modular design to support multiple email providers
 */

export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<EmailResult>
  testConnection(): Promise<boolean>
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

export interface TemplateVariables {
  clientName: string
  companyName?: string
  month?: string
  year?: string
}

export type EmailProviderType = 'gmail' | 'resend' | 'sendgrid'







