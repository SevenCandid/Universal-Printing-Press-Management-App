// 📧 EMAIL NOTIFICATION SYSTEM
// This module handles sending email notifications for large expenses

export type EmailPayload = {
  to: string[]
  subject: string
  html: string
  text?: string
}

/**
 * Send email notification using Resend API
 * Requires RESEND_API_KEY environment variable
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY
  
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY not configured')
    return false
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'UPP System <noreply@upp.com>',
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text || payload.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('❌ Email send failed:', error)
      return false
    }
    
    const data = await response.json()
    console.log('✅ Email sent successfully:', data.id)
    return true
  } catch (error) {
    console.error('❌ Email send error:', error)
    return false
  }
}

/**
 * Send large expense alert email
 */
export async function sendLargeExpenseAlert(expense: {
  title: string
  amount: number
  category: string
  description?: string
  added_by_name?: string
  created_at: string
}) {
  const threshold = Number(process.env.EXPENSE_ALERT_THRESHOLD || 1000)
  
  if (expense.amount < threshold) {
    return // Below threshold, no alert needed
  }
  
  // Get recipients from environment or use defaults
  const recipients = process.env.EXPENSE_ALERT_EMAILS?.split(',') || [
    'ceo@upp.com',
    'manager@upp.com'
  ]
  
  const subject = `🚨 Large Expense Alert: ₵${expense.amount.toLocaleString()}`
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Large Expense Alert</title>
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
      background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
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
    .alert-box {
      background: #fef2f2;
      border-left: 4px solid #dc2626;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .amount {
      font-size: 32px;
      font-weight: bold;
      color: #dc2626;
      margin: 10px 0;
    }
    .details {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #6b7280;
    }
    .detail-value {
      color: #111827;
      text-align: right;
    }
    .button {
      display: inline-block;
      background: #2563eb;
      color: white !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #1d4ed8;
    }
    .footer {
      background: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 20px;
      }
      .amount {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Large Expense Alert</h1>
      <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Universal Printing Press</p>
    </div>
    
    <div class="content">
      <div class="alert-box">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #991b1b;">
          <strong>⚠️ ATTENTION REQUIRED</strong>
        </p>
        <p style="margin: 0; font-size: 14px;">
          A large expense has been recorded that exceeds the alert threshold of ₵${threshold.toLocaleString()}.
        </p>
      </div>
      
      <div class="amount">₵${expense.amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      
      <div class="details">
        <div class="detail-row">
          <span class="detail-label">Title:</span>
          <span class="detail-value">${expense.title}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Category:</span>
          <span class="detail-value">${expense.category}</span>
        </div>
        ${expense.description ? `
        <div class="detail-row">
          <span class="detail-label">Description:</span>
          <span class="detail-value">${expense.description}</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">Added By:</span>
          <span class="detail-value">${expense.added_by_name || 'Unknown'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date & Time:</span>
          <span class="detail-value">${new Date(expense.created_at).toLocaleString()}</span>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.upp.com'}/expenses" class="button">
          View in Dashboard →
        </a>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        This is an automated alert sent because the expense amount exceeds ₵${threshold.toLocaleString()}. 
        Please review this expense in the dashboard and take appropriate action if needed.
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">Universal Printing Press - Expense Management System</p>
      <p style="margin: 5px 0 0 0;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>
  `
  
  return await sendEmail({
    to: recipients,
    subject,
    html
  })
}

/**
 * Alternative: Send email using SendGrid
 * Uncomment and configure if using SendGrid instead of Resend
 */
/*
export async function sendEmailSendGrid(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY
  
  if (!apiKey) {
    console.error('❌ SENDGRID_API_KEY not configured')
    return false
  }
  
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: payload.to.map(email => ({ email })),
        }],
        from: { email: process.env.EMAIL_FROM || 'noreply@upp.com' },
        subject: payload.subject,
        content: [
          { type: 'text/html', value: payload.html },
        ],
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ SendGrid error:', error)
      return false
    }
    
    console.log('✅ Email sent via SendGrid')
    return true
  } catch (error) {
    console.error('❌ SendGrid error:', error)
    return false
  }
}
*/
