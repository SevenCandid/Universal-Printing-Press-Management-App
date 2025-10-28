/**
 * Supabase Edge Function - Send Email
 * Alternative to client-side email sending
 * 
 * Deploy with: supabase functions deploy sendEmail
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface EmailRequest {
  to: string | string[]
  subject: string
  message: string
  title?: string
  link?: string
  linkText?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const { to, subject, message, title, link, linkText }: EmailRequest = await req.json()

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const recipients = Array.isArray(to) ? to : [to]

    // Build HTML email
    const htmlContent = buildEmailHTML({
      title: title || subject,
      message,
      link,
      linkText,
    })

    // Send via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Universal Printing Press <notifications@universalprintingpress.com>',
        to: recipients,
        subject,
        html: htmlContent,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(data)}`)
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})

function buildEmailHTML({ title, message, link, linkText }: {
  title: string
  message: string
  link?: string
  linkText?: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #1A237E 0%, #283593 100%);
      padding: 30px 20px;
      text-align: center;
    }
    .logo {
      color: #ffffff;
      font-size: 24px;
      font-weight: bold;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #1A237E;
      margin: 0 0 20px 0;
    }
    .message {
      font-size: 16px;
      line-height: 1.6;
      color: #333333;
      margin: 0 0 30px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 30px;
      background-color: #1A237E;
      color: #ffffff;
      text-decoration: none;
      font-weight: 600;
      border-radius: 6px;
      margin: 10px 0;
    }
    .footer {
      background-color: #f5f5f5;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666666;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .title {
        font-size: 20px;
      }
      .message {
        font-size: 14px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">🖨️ Universal Printing Press</h1>
    </div>
    <div class="content">
      <h2 class="title">${title}</h2>
      <p class="message">${message}</p>
      ${link ? `<a href="${link}" class="button">${linkText || 'View in Dashboard'}</a>` : ''}
    </div>
    <div class="footer">
      <p>Universal Printing Press Management System</p>
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

