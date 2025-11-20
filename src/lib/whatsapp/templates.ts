/**
 * WhatsApp message templates
 * Provides template functions for personalized WhatsApp greetings
 */

import type { WhatsAppTemplate } from './types'

export interface TemplateVariables {
  clientName: string
  companyName?: string
  month?: string
  year?: string
}

/**
 * Replace placeholders in a template string with actual values
 */
export function replacePlaceholders(
  template: string,
  variables: TemplateVariables
): string {
  const companyName = variables.companyName || 'Universal Printing Press'
  const month = variables.month || new Date().toLocaleString('default', { month: 'long' })
  const year = variables.year || new Date().getFullYear().toString()

  return template
    .replace(/\{\{clientName\}\}/g, variables.clientName)
    .replace(/\{\{companyName\}\}/g, companyName)
    .replace(/\{\{month\}\}/g, month)
    .replace(/\{\{year\}\}/g, year)
}

/**
 * Get the default monthly greeting template for WhatsApp
 * WhatsApp messages are typically shorter and more conversational
 */
export function getMonthlyGreetingTemplate(variables: TemplateVariables): WhatsAppTemplate {
  const month = variables.month || new Date().toLocaleString('default', { month: 'long' })
  const year = variables.year || new Date().getFullYear().toString()
  const companyName = variables.companyName || 'Universal Printing Press'

  const message = `Hello {{clientName}}! 👋

We hope this message finds you well!

As we welcome ${month} ${year}, we wanted to express our sincere gratitude for your continued partnership with {{companyName}}.

Your trust in our services means the world to us, and we're committed to providing you with the highest quality printing solutions.

We look forward to serving you throughout ${month} and beyond! 🎉

Warm regards,
The Team at {{companyName}}`

  return {
    message: replacePlaceholders(message, variables),
  }
}





