# 📧 Email Alerts Setup Guide

This guide explains how to set up automated email alerts for Universal Printing Press.

---

## 🎯 Overview

The system sends email alerts for:
- **New Order Created** → Notifies CEO and Manager
- **Task Assigned** → Notifies assigned staff member
- **File Uploaded/Deleted** → Notifies CEO and Manager (implemented in components)

---

## 🔧 Setup Options

You have **TWO options** for sending emails:

### Option 1: Client-Side (Simpler, Recommended for Development)
- Emails sent directly from Next.js app
- Uses `/src/lib/sendEmail.ts` helper
- Easier to set up and test

### Option 2: Edge Functions (Recommended for Production)
- Emails sent from Supabase Edge Functions
- More secure (API keys not exposed)
- Better scalability
- Uses `/supabase/functions/sendEmail/index.ts`

---

## 📝 Prerequisites

### 1. Get Resend API Key

1. Sign up at [https://resend.com](https://resend.com)
2. Verify your domain (or use their free test domain)
3. Create an API key
4. Copy the API key

### 2. Update Email Sender

In both files, change the `from` email:

**File:** `src/lib/sendEmail.ts` and `supabase/functions/sendEmail/index.ts`

```typescript
from: 'Universal Printing Press <notifications@yourdomain.com>'
// Replace with your verified domain
```

---

## ⚡ Option 1: Client-Side Setup (Quick Start)

### Step 1: Add API Key to Environment

Add to `.env.local`:

```bash
RESEND_API_KEY=re_your_api_key_here
```

### Step 2: Update NewOrderModal

The email sending is already integrated in the components. When a new order is created, it will automatically:
1. Insert notification to database
2. Send email to CEO and Manager

**File:** `src/components/ui/NewOrderModal.tsx`

Add this import:
```typescript
import { sendEmail, getCEOAndManagerEmails } from '@/lib/sendEmail'
```

Add after order creation:
```typescript
// After successful order creation
const managerEmails = await getCEOAndManagerEmails(supabase)
if (managerEmails.length > 0) {
  await sendEmail({
    to: managerEmails,
    subject: `🧾 New Order Created - #${orderNumber}`,
    title: '🧾 New Order Created',
    message: `A new order has been created:\n\nCustomer: ${customerName}\nOrder Number: ${orderNumber}\nAmount: ₵${amount}`,
    link: `${window.location.origin}/orders`,
    linkText: 'View Order',
  })
}
```

### Step 3: Test

1. Create a new order
2. Check CEO/Manager email inboxes
3. Check browser console for any errors

---

## 🚀 Option 2: Edge Functions Setup (Production)

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Link to Your Project

```bash
supabase login
supabase link --project-ref your-project-ref
```

### Step 3: Set API Key Secret

```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

Or set it in Supabase Dashboard:
- Go to Project Settings → Edge Functions → Secrets
- Add `RESEND_API_KEY` with your API key

### Step 4: Deploy Edge Function

```bash
cd supabase/functions
supabase functions deploy sendEmail
```

### Step 5: Run SQL Triggers

Run the SQL in `email-triggers.sql` in your Supabase SQL Editor.

This will:
- Create trigger functions
- Automatically send emails when orders/tasks are created

### Step 6: Test

1. Insert a test order in Supabase dashboard
2. Check email inbox
3. Check Edge Function logs

---

## 🧪 Testing

### Test Email Function (Client-Side)

Create a test file `test-email.ts`:

```typescript
import { sendEmail } from './src/lib/sendEmail'

async function testEmail() {
  const result = await sendEmail({
    to: 'yourtest@email.com',
    subject: 'Test Email',
    title: 'Test Title',
    message: 'This is a test email from UPP system.',
    link: 'https://google.com',
    linkText: 'Click Here',
  })
  
  console.log('Result:', result)
}

testEmail()
```

Run with:
```bash
npx ts-node test-email.ts
```

### Test Edge Function

```bash
curl -i --location --request POST 'https://your-project-ref.supabase.co/functions/v1/sendEmail' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"to":"test@example.com","subject":"Test","message":"Hello","title":"Test Title"}'
```

---

## 📧 Email Templates

The system uses responsive HTML email templates with:
- Company branding (logo, colors)
- Mobile-friendly design
- Clear call-to-action buttons
- Professional footer

### Customize Template

Edit the `buildEmailHTML` function in:
- `src/lib/sendEmail.ts` (client-side)
- `supabase/functions/sendEmail/index.ts` (Edge Functions)

Change colors, fonts, layout as needed.

---

## 🔐 Security Best Practices

### Client-Side Approach
- ✅ Use environment variables
- ✅ Never commit `.env.local`
- ⚠️ API key is in client bundle (less secure)

### Edge Functions Approach
- ✅ API key never exposed to client
- ✅ Secure server-side execution
- ✅ Better for production

**Recommendation:** Use client-side for development, switch to Edge Functions for production.

---

## 🐛 Troubleshooting

### Emails Not Sending

**Check 1:** API Key
```bash
echo $RESEND_API_KEY  # Should output your key
```

**Check 2:** Console Errors
- Open browser DevTools
- Check Console tab
- Look for "Email send error"

**Check 3:** Resend Dashboard
- Go to [https://resend.com/emails](https://resend.com/emails)
- Check recent sends
- Check for bounces/errors

### Wrong Sender Email

If emails show "via resend.dev":
- Verify your domain in Resend
- Update `from` field to use your domain

### Edge Function Errors

Check logs:
```bash
supabase functions logs sendEmail
```

Or in dashboard:
- Edge Functions → sendEmail → Logs

---

## 📊 Email Events Covered

| Event | Trigger | Recipients | Status |
|-------|---------|------------|--------|
| New Order | Order INSERT | CEO, Manager | ✅ Ready |
| Order Updated | Manual in EditOrderModal | CEO, Manager | 🔄 Optional |
| Task Assigned | Task INSERT | Assigned Staff | ✅ Ready |
| Task Completed | Task UPDATE | CEO, Manager | 🔄 Optional |
| File Uploaded | File upload in FilesBase | CEO, Manager | ✅ Ready |
| File Deleted | File delete in FilesBase | CEO, Manager | ✅ Ready |

---

## 🎨 Customization

### Add More Recipients

```typescript
// Get all staff emails
const { data } = await supabase
  .from('profiles')
  .select('email')
  .eq('role', 'staff')

const staffEmails = data.map(p => p.email)
```

### Customize Email Content

```typescript
await sendEmail({
  to: emails,
  subject: 'Your Custom Subject',
  title: 'Custom Title',
  message: `
    Custom message with HTML:
    <ul>
      <li>Point 1</li>
      <li>Point 2</li>
    </ul>
  `,
  link: '/custom-link',
  linkText: 'Custom Button Text',
})
```

### Add Attachments (Resend)

Resend supports attachments. Update the API call:

```typescript
body: JSON.stringify({
  from: '...',
  to: recipients,
  subject,
  html: htmlContent,
  attachments: [{
    filename: 'invoice.pdf',
    content: base64Content,
  }],
}),
```

---

## 📚 Resources

- [Resend Documentation](https://resend.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Email Best Practices](https://www.resend.com/docs/best-practices)

---

## ✅ Quick Checklist

- [ ] Sign up for Resend account
- [ ] Verify domain (or use test domain)
- [ ] Get API key
- [ ] Add to `.env.local` or Supabase secrets
- [ ] Update sender email in code
- [ ] Choose client-side OR Edge Functions
- [ ] Test with sample order
- [ ] Verify emails arrive
- [ ] Customize templates as needed
- [ ] Deploy to production

---

**Questions?** Check the browser console and Supabase logs for detailed error messages.

