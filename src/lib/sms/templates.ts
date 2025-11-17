/**
 * SMS templates for client greetings
 * Supports placeholder replacement for personalization
 */

import type { SMSTemplate } from './types'

export interface TemplateVariables {
  clientName: string
  companyName?: string
  month?: string
  year?: string
}

/**
 * Replace placeholders in template with actual values
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
 * Monthly greeting SMS template
 * Keep it concise (SMS has character limits)
 */
export function getMonthlyGreetingTemplate(variables: TemplateVariables): SMSTemplate {
  const month = variables.month || new Date().toLocaleString('default', { month: 'long' })
  const year = variables.year || new Date().getFullYear().toString()
  const companyName = variables.companyName || 'Universal Printing Press'

  const message = `Dear {{clientName}}, we hope this message finds you well! As we welcome ${month} ${year}, we wanted to express our sincere gratitude for your continued partnership with {{companyName}}. We look forward to serving you throughout ${month} and beyond. Warm regards, The Team at {{companyName}}

Website: https://universalprintingpress.com/
Phone: +233 59 999 7279`

  return {
    message: replacePlaceholders(message, variables),
  }
}

