/**
 * Main SMS service
 * Provides a unified interface for sending SMS across different providers
 */

import type { SMSProvider, SMSOptions, SMSResult, SMSTemplate, SMSProviderType } from './types'
import { getSMSProvider } from './providers'
import { getMonthlyGreetingTemplate, replacePlaceholders, type TemplateVariables } from './templates'

class SMSService {
  private provider: SMSProvider

  constructor(providerType?: SMSProviderType) {
    this.provider = getSMSProvider(providerType)
  }

  /**
   * Test the SMS provider connection
   */
  async testConnection(): Promise<boolean> {
    return await this.provider.testConnection()
  }

  /**
   * Send a single SMS
   */
  async sendSMS(options: SMSOptions): Promise<SMSResult> {
    return await this.provider.sendSMS(options)
  }

  /**
   * Send personalized greeting SMS to a client
   */
  async sendGreetingSMS(
    to: string,
    clientName: string,
    customVariables?: Partial<TemplateVariables>
  ): Promise<SMSResult> {
    const variables: TemplateVariables = {
      clientName,
      companyName: process.env.COMPANY_NAME || 'Universal Printing Press',
      month: new Date().toLocaleString('default', { month: 'long' }),
      year: new Date().getFullYear().toString(),
      ...customVariables,
    }

    const template = getMonthlyGreetingTemplate(variables)

    return await this.sendSMS({
      to,
      message: template.message,
    })
  }

  /**
   * Send greeting SMS to multiple clients
   * Returns results for each SMS send attempt
   */
  async sendBulkGreetingSMS(
    clients: Array<{ phone: string; name: string }>
  ): Promise<Array<{ phone: string; name: string; result: SMSResult }>> {
    const results = await Promise.all(
      clients.map(async (client) => {
        const result = await this.sendGreetingSMS(client.phone, client.name)
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
export const smsService = new SMSService()

// Export class for custom instances
export { SMSService }







