# Email Service Setup Guide

This guide explains how to configure the Gmail SMTP email service for sending client greeting emails.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Gmail SMTP Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=rxmk dlfx xzpp ihyr

# Optional: Company name for email templates
COMPANY_NAME=Universal Printing Press

# Optional: Email provider (defaults to 'gmail')
EMAIL_PROVIDER=gmail
```

## Gmail App Password Setup

Since Gmail requires app passwords for SMTP authentication, follow these steps:

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings: https://myaccount.google.com
2. Navigate to **Security**
3. Enable **2-Step Verification** if not already enabled

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select **Mail** as the app
3. Select **Other (Custom name)** as the device
4. Enter "UPP Client Connect" as the name
5. Click **Generate**
6. Copy the 16-character password (no spaces)

### Step 3: Configure Environment Variables
Add the app password to your `.env.local`:

```env
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=xxxx xxxx xxxx xxxx  # Use the 16-character app password
```

## Testing the Connection

The email service will automatically test the connection when you:
1. Load the Client Connect page
2. Click "Send Greetings" button

You can also test manually by calling the API endpoint:
```bash
curl http://localhost:3000/api/client-connect/send-email
```

## Email Template Customization

The email templates support the following placeholders:
- `{{clientName}}` - Client's name
- `{{companyName}}` - Company name (from COMPANY_NAME env var)
- `{{month}}` - Current month name
- `{{year}}` - Current year

Templates are defined in `src/lib/email/templates.ts` and can be customized as needed.

## Architecture

The email service is designed with a modular architecture:

- **Providers** (`src/lib/email/providers/`): Email provider implementations
  - `gmail.ts`: Gmail SMTP provider using Nodemailer
  - Future providers can be added (Resend, SendGrid, etc.)

- **Service** (`src/lib/email/service.ts`): Main email service interface
  - Unified API for sending emails
  - Template rendering
  - Bulk email sending

- **Templates** (`src/lib/email/templates.ts`): Email template definitions
  - HTML and text templates
  - Placeholder replacement

- **API Route** (`src/app/api/client-connect/send-email/route.ts`): HTTP endpoint
  - Handles email sending requests
  - Validates input
  - Returns detailed results

## Adding New Email Providers

To add a new email provider:

1. Create a new provider class in `src/lib/email/providers/`
2. Implement the `EmailProvider` interface
3. Register it in `src/lib/email/providers/index.ts`
4. Update `EMAIL_PROVIDER` environment variable

Example:
```typescript
// src/lib/email/providers/resend.ts
export class ResendProvider implements EmailProvider {
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    // Implementation
  }
  
  async testConnection(): Promise<boolean> {
    // Implementation
  }
}
```

## Security Notes

- Never commit `.env.local` to version control
- Use app passwords, not your regular Gmail password
- Rotate app passwords regularly
- Consider using environment-specific configurations for production

## Troubleshooting

### "Email service not configured" error
- Verify `GMAIL_USER` and `GMAIL_PASS` are set in `.env.local`
- Restart your development server after adding environment variables
- Ensure you're using an app password, not your regular password

### "Invalid login" error
- Verify 2-Step Verification is enabled
- Ensure you're using an app password, not your regular password
- Check that the app password hasn't been revoked

### "Connection timeout" error
- Check your network connection
- Verify Gmail SMTP is accessible from your server
- Check firewall settings

## Support

For issues or questions, please check:
1. Gmail SMTP documentation: https://support.google.com/mail/answer/7126229
2. Nodemailer documentation: https://nodemailer.com/about/







