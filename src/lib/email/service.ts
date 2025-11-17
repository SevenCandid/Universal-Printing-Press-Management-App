/**
 * Main email service
 * Provides a unified interface for sending emails across different providers
 */

import type { EmailProvider, EmailOptions, EmailResult, EmailTemplate, TemplateVariables } from './types'
import { getEmailProvider } from './providers'
import { getMonthlyGreetingTemplate, replacePlaceholders } from './templates'

class EmailService {
  private provider: EmailProvider

  constructor(providerType?: string) {
    this.provider = getEmailProvider(providerType as any)
  }

  /**
   * Test the email provider connection
   */
  async testConnection(): Promise<boolean> {
    return await this.provider.testConnection()
  }

  /**
   * Send a single email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    return await this.provider.sendEmail(options)
  }

  /**
   * Send personalized greeting email to a client
   */
  async sendGreetingEmail(
    to: string,
    clientName: string,
    customVariables?: Partial<TemplateVariables & { customTemplate?: string }>
  ): Promise<EmailResult> {
    const variables: TemplateVariables = {
      clientName,
      companyName: process.env.COMPANY_NAME || 'Universal Printing Press',
      month: new Date().toLocaleString('default', { month: 'long' }),
      year: new Date().getFullYear().toString(),
      ...customVariables,
    }

    let template: EmailTemplate
    if (customVariables?.customTemplate) {
      // Use custom template with placeholder replacement
      const replacedText = replacePlaceholders(customVariables.customTemplate, variables)
      template = {
        subject: `Monthly Greetings from ${variables.companyName} - ${variables.month} ${variables.year}`,
        html: replacedText.replace(/\n/g, '<br>'),
        text: replacedText,
      }
    } else {
      // Use default template
      template = getMonthlyGreetingTemplate(variables)
    }

    return await this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })
  }

  /**
   * Send greeting emails to multiple clients
   * Returns results for each email send attempt
   */
  async sendBulkGreetingEmails(
    clients: Array<{ email: string; name: string }>
  ): Promise<Array<{ email: string; name: string; result: EmailResult }>> {
    const results = await Promise.all(
      clients.map(async (client) => {
        const result = await this.sendGreetingEmail(client.email, client.name)
        return {
          email: client.email,
          name: client.name,
          result,
        }
      })
    )

    return results
  }
}

// Export singleton instance
export const emailService = new EmailService()

// Export class for custom instances
export { EmailService }







