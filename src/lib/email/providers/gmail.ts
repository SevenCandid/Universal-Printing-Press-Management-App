/**
 * Gmail SMTP Provider using Nodemailer
 * Reads credentials from GMAIL_USER and GMAIL_PASS environment variables
 */

import nodemailer, { Transporter } from 'nodemailer'
import type { EmailProvider, EmailOptions, EmailResult } from '../types'

export class GmailProvider implements EmailProvider {
  private transporter: Transporter | null = null
  private initialized: boolean = false

  private initialize(): void {
    if (this.initialized && this.transporter) {
      return
    }

    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_PASS

    if (!user || !pass) {
      throw new Error(
        'Gmail credentials not configured. Please set GMAIL_USER and GMAIL_PASS environment variables.'
      )
    }

    // Remove spaces from app password (Gmail app passwords may have spaces)
    const cleanPass = pass.replace(/\s+/g, '')

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user.trim(),
        pass: cleanPass,
      },
    })

    this.initialized = true
  }

  async testConnection(): Promise<boolean> {
    try {
      this.initialize()
      if (!this.transporter) {
        return false
      }
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('Gmail connection test failed:', error)
      return false
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      this.initialize()

      if (!this.transporter) {
        return {
          success: false,
          error: 'Gmail transporter not initialized',
        }
      }

      const fromEmail = options.from || process.env.GMAIL_USER || 'noreply@upp.com'
      const toEmails = Array.isArray(options.to) ? options.to : [options.to]

      const mailOptions = {
        from: `"Universal Printing Press" <${fromEmail}>`,
        to: toEmails.join(', '),
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        replyTo: options.replyTo || fromEmail,
      }

      const info = await this.transporter.sendMail(mailOptions)

      return {
        success: true,
        messageId: info.messageId,
      }
    } catch (error: any) {
      console.error('Gmail send error:', error)
      return {
        success: false,
        error: error.message || 'Failed to send email via Gmail',
      }
    }
  }
}







