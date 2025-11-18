/**
 * SMS provider factory
 * Returns the appropriate SMS provider based on configuration
 */

import type { SMSProvider, SMSProviderType } from '../types'
import { TermiiProvider } from './termii'
// Future providers can be imported here:
// import { WhatsAppProvider } from './whatsapp'
// import { TwilioProvider } from './twilio'

export function getSMSProvider(type?: SMSProviderType): SMSProvider {
  // Default to Termii if no type specified
  const providerType = type || (process.env.SMS_PROVIDER as SMSProviderType) || 'termii'

  switch (providerType) {
    case 'termii':
      return new TermiiProvider()
    // Future providers:
    // case 'whatsapp':
    //   return new WhatsAppProvider()
    // case 'twilio':
    //   return new TwilioProvider()
    default:
      throw new Error(`Unsupported SMS provider: ${providerType}`)
  }
}



