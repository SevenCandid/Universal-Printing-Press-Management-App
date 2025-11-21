/**
 * Email provider factory
 * Returns the appropriate email provider based on configuration
 */

import type { EmailProvider, EmailProviderType } from '../types'
import { GmailProvider } from './gmail'
// Future providers can be imported here:
// import { ResendProvider } from './resend'
// import { SendGridProvider } from './sendgrid'

export function getEmailProvider(type?: EmailProviderType): EmailProvider {
  // Default to Gmail if no type specified
  const providerType = type || (process.env.EMAIL_PROVIDER as EmailProviderType) || 'gmail'

  switch (providerType) {
    case 'gmail':
      return new GmailProvider()
    // Future providers:
    // case 'resend':
    //   return new ResendProvider()
    // case 'sendgrid':
    //   return new SendGridProvider()
    default:
      throw new Error(`Unsupported email provider: ${providerType}`)
  }
}













