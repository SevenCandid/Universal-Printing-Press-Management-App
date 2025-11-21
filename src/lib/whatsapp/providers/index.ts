/**
 * WhatsApp provider factory
 * Returns the appropriate WhatsApp provider based on configuration
 */

import type { WhatsAppProvider, WhatsAppProviderType } from '../types'
// Future providers can be imported here:
// import { WhatsAppBusinessAPIProvider } from './business-api'
// import { TwilioWhatsAppProvider } from './twilio'
// import { MetaWhatsAppProvider } from './meta'

/**
 * Placeholder provider for future implementation
 * This will be replaced with actual provider implementations
 */
class PlaceholderWhatsAppProvider implements WhatsAppProvider {
  async testConnection(): Promise<boolean> {
    // Placeholder: always returns false until implemented
    return false
  }

  async sendMessage(options: import('../types').WhatsAppOptions): Promise<import('../types').WhatsAppResult> {
    // Placeholder: returns error until implemented
    return {
      success: false,
      error: 'WhatsApp service is not yet implemented. Coming soon!',
    }
  }
}

export function getWhatsAppProvider(type?: WhatsAppProviderType): WhatsAppProvider {
  // Default provider type from environment or use placeholder
  const providerType = type || (process.env.WHATSAPP_PROVIDER as WhatsAppProviderType) || 'business_api'

  switch (providerType) {
    // Future providers:
    // case 'business_api':
    //   return new WhatsAppBusinessAPIProvider()
    // case 'twilio':
    //   return new TwilioWhatsAppProvider()
    // case 'meta':
    //   return new MetaWhatsAppProvider()
    default:
      // Return placeholder until providers are implemented
      return new PlaceholderWhatsAppProvider()
  }
}






