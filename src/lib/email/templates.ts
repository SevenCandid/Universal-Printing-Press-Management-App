/**
 * Email templates for client greetings
 * Supports placeholder replacement for personalization
 */

import type { EmailTemplate, TemplateVariables } from './types'

// Re-export for backward compatibility
export type { TemplateVariables }

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
 * Monthly greeting email template
 */
export function getMonthlyGreetingTemplate(variables: TemplateVariables): EmailTemplate {
  const month = variables.month || new Date().toLocaleString('default', { month: 'long' })
  const year = variables.year || new Date().getFullYear().toString()
  const companyName = variables.companyName || 'Universal Printing Press'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monthly Greetings from ${companyName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: bold;
    }
    .content {
      padding: 30px;
    }
    .greeting {
      font-size: 18px;
      color: #111827;
      margin-bottom: 20px;
    }
    .message {
      font-size: 15px;
      color: #4b5563;
      line-height: 1.8;
      margin-bottom: 30px;
    }
    .highlight {
      background: #eff6ff;
      border-left: 4px solid #2563eb;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      background: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .signature {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌙 Monthly Greetings</h1>
      <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">${companyName}</p>
    </div>
    
    <div class="content">
      <div class="greeting">
        Dear {{clientName}},
      </div>
      
      <div class="message">
        <p>We hope this message finds you well!</p>
        
        <p>As we welcome ${month} ${year}, we wanted to take a moment to express our sincere gratitude for your continued partnership with {{companyName}}.</p>
        
        <div class="highlight">
          <p style="margin: 0; font-weight: 600; color: #1e40af;">
            Your trust in our services means the world to us, and we're committed to providing you with the highest quality printing solutions.
          </p>
        </div>
        
        <p>Whether you're working on a new project or need assistance with an ongoing one, our team is here to help you achieve your goals.</p>
        
        <p>We look forward to serving you throughout ${month} and beyond.</p>
      </div>
      
      <div class="signature">
        <p style="margin: 0; font-weight: 600;">Warm regards,</p>
        <p style="margin: 5px 0 0 0;">The Team at {{companyName}}</p>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">
          Universal Printing Press<br>
          Your trusted printing partner
        </p>
      </div>
    </div>
    
      <div class="footer">
      <p style="margin: 0;">${companyName} - Monthly Greetings</p>
      <p style="margin: 5px 0 0 0;">
        This is an automated monthly greeting. If you have any questions or concerns, please don't hesitate to contact us.
      </p>
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #9ca3af;">
        <a href="https://universalprintingpress.com/" style="color: #2563eb; text-decoration: none;">https://universalprintingpress.com/</a> | 
        <a href="tel:+233599997279" style="color: #2563eb; text-decoration: none;">+233 59 999 7279</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()

  const text = `
Dear {{clientName}},

We hope this message finds you well!

As we welcome ${month} ${year}, we wanted to take a moment to express our sincere gratitude for your continued partnership with {{companyName}}.

Your trust in our services means the world to us, and we're committed to providing you with the highest quality printing solutions.

Whether you're working on a new project or need assistance with an ongoing one, our team is here to help you achieve your goals.

We look forward to serving you throughout ${month} and beyond.

Warm regards,
The Team at {{companyName}}

Universal Printing Press
Your trusted printing partner

---
${companyName} - Monthly Greetings
This is an automated monthly greeting. If you have any questions or concerns, please don't hesitate to contact us.

Website: https://universalprintingpress.com/
Phone: +233 59 999 7279
  `.trim()

  const subject = `Monthly Greetings from ${companyName} - ${month} ${year}`

  return {
    subject: replacePlaceholders(subject, variables),
    html: replacePlaceholders(html, variables),
    text: replacePlaceholders(text, variables),
  }
}







