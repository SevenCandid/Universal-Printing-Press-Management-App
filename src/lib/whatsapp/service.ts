/**
 * Main WhatsApp service
 * Provides a unified interface for sending WhatsApp messages across different providers
 * 
 * This service follows the same structure as EmailService and SMSService
 * for consistency and easy integration.
 */

import type { WhatsAppProvider, WhatsAppOptions, WhatsAppResult, WhatsAppTemplate, WhatsAppProviderType } from './types'
import { getWhatsAppProvider } from './providers'
import { getMonthlyGreetingTemplate, replacePlaceholders, type TemplateVariables } from './templates'

class WhatsAppService {
  private provider: WhatsAppProvider

  constructor(providerType?: WhatsAppProviderType) {
    this.provider = getWhatsAppProvider(providerType)
  }

  /**
   * Test the WhatsApp provider connection
   */
  async testConnection(): Promise<boolean> {
    return await this.provider.testConnection()
  }

  /**
   * Send a single WhatsApp message
   */
  async sendMessage(options: WhatsAppOptions): Promise<WhatsAppResult> {
    return await this.provider.sendMessage(options)
  }

  /**
   * Send personalized greeting WhatsApp message to a client
   * This method follows the same pattern as sendGreetingEmail() and sendGreetingSMS()
   */
  async sendGreetingWhatsApp(
    to: string,
    clientName: string,
    customVariables?: Partial<TemplateVariables>
  ): Promise<WhatsAppResult> {
    const variables: TemplateVariables = {
      clientName,
      companyName: process.env.COMPANY_NAME || 'Universal Printing Press',
      month: new Date().toLocaleString('default', { month: 'long' }),
      year: new Date().getFullYear().toString(),
      ...customVariables,
    }

    const template = getMonthlyGreetingTemplate(variables)

    return await this.sendMessage({
      to,
      message: template.message,
    })
  }

  /**
   * Send greeting WhatsApp messages to multiple clients
   * Returns results for each message send attempt
   * This method follows the same pattern as sendBulkGreetingEmails() and sendBulkGreetingSMS()
   */
  async sendBulkGreetingWhatsApp(
    clients: Array<{ phone: string; name: string }>
  ): Promise<Array<{ phone: string; name: string; result: WhatsAppResult }>> {
    const results = await Promise.all(
      clients.map(async (client) => {
        const result = await this.sendGreetingWhatsApp(client.phone, client.name)
        return {
          phone: client.phone,
          name: client.name,
          result,
        }
      })
    )

    return results
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService()

// Export class for custom instances
export { WhatsAppService }



