# 🧾 Expenses System - Complete Documentation

## 📋 Overview

The Universal Printing Press (UPP) Expenses System is a comprehensive expense management solution with:

- ✅ Full CRUD operations (CEO & Manager only)
- ✅ Real-time updates across all dashboards
- ✅ Email alerts for large expenses
- ✅ Mobile push notifications (FCM or OneSignal)
- ✅ Integration with Reports (Net Revenue, Profit Margin)
- ✅ Role-based access control
- ✅ Export to CSV
- ✅ Search, filter, and date range queries

---

## 🚀 Quick Start

### 1. Database Setup

Run the SQL script in Supabase SQL Editor:

```bash
# File: EXPENSES_SYSTEM_SETUP.sql
```

This creates:
- `expenses` table with RLS policies
- `user_devices` table for push tokens
- Notifications table enhancements
- Triggers for auto-alerts
- Helper views for reports

### 2. Environment Variables

Add to `.env.local`:

```bash
# =============================================================================
# EXPENSES SYSTEM CONFIGURATION
# =============================================================================

# Alert Threshold (expenses >= this amount trigger alerts)
EXPENSE_ALERT_THRESHOLD=1000

# Email Configuration (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="UPP System <noreply@your-domain.com>"
EXPENSE_ALERT_EMAILS="ceo@company.com,manager@company.com"

# OR use SendGrid instead:
# SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx

# Push Notifications (choose ONE)
PUSH_PROVIDER=fcm  # or "onesignal"

# Firebase Cloud Messaging (FCM)
FCM_SERVER_KEY=AAAA:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_FCM_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FCM_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FCM_PROJECT_ID=your-app-id
NEXT_PUBLIC_FCM_STORAGE_BUCKET=your-app.appspot.com
NEXT_PUBLIC_FCM_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FCM_APP_ID=1:123456789012:web:xxxxxxxxxxxx

# OR OneSignal:
# NEXT_PUBLIC_ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# ONESIGNAL_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# App URL (for email links)
NEXT_PUBLIC_APP_URL=https://app.upp.com
```

### 3. Install Dependencies

The system uses existing dependencies, but ensure you have:

```bash
npm install
# or
yarn install
```

### 4. Deploy

```bash
npm run build
npm run start
# or
vercel deploy
```

---

## 📧 Email Notifications Setup

### Option A: Resend (Recommended)

1. **Create Resend Account**
   - Go to https://resend.com/
   - Sign up and verify your email

2. **Add Domain**
   - In Resend Dashboard → Domains → Add Domain
   - Add your domain (e.g., `upp.com`)
   - Add DNS records (MX, TXT, DKIM, SPF)
   - Verify domain

3. **Get API Key**
   - In Resend Dashboard → API Keys → Create API Key
   - Copy the key and add to `.env.local`:
   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
   ```

4. **Configure Sender**
   ```bash
   EMAIL_FROM="UPP Expenses <expenses@upp.com>"
   ```

### Option B: SendGrid

1. **Create SendGrid Account**
   - Go to https://sendgrid.com/
   - Sign up for free tier (100 emails/day)

2. **Verify Sender Identity**
   - Settings → Sender Authentication
   - Verify a Single Sender or Domain

3. **Create API Key**
   - Settings → API Keys → Create API Key
   - Select "Full Access" or "Mail Send" permission
   - Copy key:
   ```bash
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
   ```

4. **Update Code**
   Uncomment SendGrid function in `src/lib/sendEmail.ts`

---

## 🔔 Push Notifications Setup

### Option A: Firebase Cloud Messaging (FCM)

#### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Enter project name: `UPP-App`
4. Disable Google Analytics (optional)
5. Click "Create project"

#### Step 2: Add Web App

1. In Firebase Console → Project Overview
2. Click web icon (</>) "Add app"
3. Register app name: `UPP Web`
4. Check "Also set up Firebase Hosting" (optional)
5. Copy the config values

#### Step 3: Enable Cloud Messaging

1. In Firebase Console → Build → Cloud Messaging
2. Under "Web configuration" → "Web Push certificates"
3. Click "Generate key pair"
4. Copy the "Key pair" (this is your VAPID key)

#### Step 4: Get Server Key

1. In Firebase Console → Project Settings (⚙️)
2. Go to "Cloud Messaging" tab
3. Under "Project credentials" → "Server key"
4. Copy the server key

#### Step 5: Add to Environment Variables

```bash
# FCM Configuration
PUSH_PROVIDER=fcm
FCM_SERVER_KEY=AAAA:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_FCM_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FCM_AUTH_DOMAIN=upp-app.firebaseapp.com
NEXT_PUBLIC_FCM_PROJECT_ID=upp-app-12345
NEXT_PUBLIC_FCM_STORAGE_BUCKET=upp-app-12345.appspot.com
NEXT_PUBLIC_FCM_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FCM_APP_ID=1:123456789012:web:abcd1234efgh5678
NEXT_PUBLIC_FCM_VAPID_KEY=BAbCD1234EFgH5678... (from step 3)
```

#### Step 6: Create Service Worker

Create `public/firebase-messaging-sw.js`:

```javascript
// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "upp-app.firebaseapp.com",
  projectId: "upp-app-12345",
  storageBucket: "upp-app-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcd1234efgh5678"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload)
  
  const notificationTitle = payload.notification.title
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icon-192x192.png',
    badge: '/icon-72x72.png',
    data: payload.data
  }
  
  self.registration.showNotification(notificationTitle, notificationOptions)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  )
})
```

#### Step 7: Initialize FCM in Your App

Create `src/lib/initFCM.ts`:

```typescript
import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { registerDeviceToken } from './pushNotify'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FCM_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FCM_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FCM_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FCM_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FCM_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FCM_APP_ID
}

const app = initializeApp(firebaseConfig)
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null

export async function requestFCMToken(userId: string): Promise<string | null> {
  if (!messaging) return null
  
  try {
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY
    })
    
    if (token) {
      await registerDeviceToken(userId, token, 'web', 'FCM Web')
      return token
    }
  } catch (error) {
    console.error('FCM token error:', error)
  }
  
  return null
}

export function listenForFCMMessages(callback: (payload: any) => void) {
  if (!messaging) return
  
  onMessage(messaging, (payload) => {
    console.log('Foreground message:', payload)
    callback(payload)
  })
}
```

---

### Option B: OneSignal (Simpler Setup)

#### Step 1: Create OneSignal Account

1. Go to https://onesignal.com/
2. Sign up (free up to 10k subscribers)

#### Step 2: Create New App

1. Dashboard → New App/Website
2. Select "Web Push"
3. Enter app name: `UPP`
4. Upload icon (512x512px)

#### Step 3: Configure Web Push

1. Select "Typical Site" (or choose your setup)
2. Enter your site URL: `https://app.upp.com`
3. Upload icon and large icon
4. Permission prompt: Customize messages
5. Advanced: Enable Safari

#### Step 4: Get Credentials

1. Settings → Keys & IDs
2. Copy:
   - OneSignal App ID
   - REST API Key

```bash
PUSH_PROVIDER=onesignal
NEXT_PUBLIC_ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ONESIGNAL_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Step 5: Add OneSignal SDK

In `app/layout.tsx` or `_document.tsx`:

```typescript
<Script src="https://cdn.onesignal.com/sdks/OneSignalSDK.js" async />
<Script id="onesignal-init">
  {`
    window.OneSignal = window.OneSignal || [];
    OneSignal.push(function() {
      OneSignal.init({
        appId: "${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID}",
        notifyButton: {
          enable: true,
        },
      });
    });
  `}
</Script>
```

---

## 📊 Reports Integration

The expenses system automatically integrates with Reports. Update `src/components/rolebase/ReportsBase.tsx`:

### Add Expenses Metrics

```typescript
// Fetch total expenses
const { data: expenses } = await supabase
  .from('expenses')
  .select('amount, created_at')
  .gte('created_at', startDate)
  .lte('created_at', endDate)

const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0

// Calculate net revenue and profit margin
const netRevenue = totalRevenue - totalExpenses
const profitMargin = totalRevenue > 0 ? (netRevenue / totalRevenue) * 100 : 0
```

### Add UI Cards

```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  {/* Total Revenue */}
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-green-600">
        ₵{totalRevenue.toLocaleString()}
      </div>
    </CardContent>
  </Card>
  
  {/* Total Expenses */}
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-red-600">
        ₵{totalExpenses.toLocaleString()}
      </div>
    </CardContent>
  </Card>
  
  {/* Net Revenue */}
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${netRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        ₵{netRevenue.toLocaleString()}
      </div>
    </CardContent>
  </Card>
  
  {/* Profit Margin */}
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {profitMargin.toFixed(1)}%
      </div>
    </CardContent>
  </Card>
</div>
```

---

## 🔐 Security & Permissions

### Role-Based Access

| Role | View Expenses | Create | Edit | Delete |
|------|---------------|--------|------|--------|
| **CEO** | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ✅ | ✅ | ✅ | ✅ |
| **Board** | ✅ | ❌ | ❌ | ❌ |
| **Staff** | ✅ | ❌ | ❌ | ❌ |

### RLS Policies

All database access is protected by Row Level Security:

- `SELECT`: All authenticated users can view
- `INSERT/UPDATE/DELETE`: Only CEO and Manager roles

### Input Validation

- Amount: Must be >= 0
- Category: Must be from predefined list
- Title: Required, non-empty
- Description: Optional

---

## 🧪 Testing

### Test Email Notifications

1. Set threshold to a low value for testing:
   ```bash
   EXPENSE_ALERT_THRESHOLD=1
   ```

2. Add an expense with amount >= threshold

3. Check your inbox for the alert email

### Test Push Notifications

1. Go to Expenses page
2. Click browser notification permission prompt
3. Add a large expense
4. You should receive a push notification

### Test Reports Integration

1. Add several expenses
2. Go to Reports page
3. Verify:
   - Total Expenses card shows correct sum
   - Net Revenue = Total Revenue - Expenses
   - Profit Margin calculated correctly

---

## 📱 Mobile App Integration

### For React Native / Expo

1. Install FCM package:
   ```bash
   expo install expo-notifications expo-device
   ```

2. Register device token:
   ```typescript
   import * as Notifications from 'expo-notifications'
   import { registerDeviceToken } from '@/lib/pushNotify'
   
   const token = await Notifications.getExpoPushTokenAsync()
   await registerDeviceToken(userId, token.data, 'ios', 'Expo iOS')
   ```

### For Flutter

1. Add firebase_messaging package
2. Get FCM token and register with `registerDeviceToken`

---

## 🐛 Troubleshooting

### Emails Not Sending

✅ Check environment variables are set  
✅ Verify Resend/SendGrid API key is valid  
✅ Check domain is verified  
✅ Look in Resend/SendGrid dashboard for errors  
✅ Check spam folder

### Push Notifications Not Working

✅ Check FCM/OneSignal credentials  
✅ Verify service worker is registered  
✅ Check browser console for errors  
✅ Ensure HTTPS (required for push)  
✅ Check notification permission is granted

### Expenses Not Appearing

✅ Check RLS policies are applied  
✅ Verify user role in profiles table  
✅ Check browser console for Supabase errors  
✅ Ensure realtime is enabled in Supabase

### Reports Not Updating

✅ Verify expenses table has data  
✅ Check date range filters  
✅ Clear browser cache  
✅ Check Supabase query in Network tab

---

## 📈 Performance Optimization

### Database Indexes

All critical columns are indexed:
- `created_at` (DESC) - for date range queries
- `category` - for category filtering
- `added_by` - for user filtering
- `amount` (DESC) - for sorting

### Caching

Consider adding caching for:
- Total expenses (Redis/Upstash)
- Category summaries
- Monthly aggregates

### Batch Notifications

For large user bases, use batch processing:
- Queue large expense notifications
- Send in batches of 1000 tokens
- Use Edge Functions for async processing

---

## 🔄 Maintenance

### Monthly Tasks

- Review large expense alerts
- Clean up old device tokens
- Archive old expenses (optional)
- Check email/push delivery rates

### Quarterly Tasks

- Update expense categories if needed
- Review and adjust alert thresholds
- Audit RLS policies
- Update dependencies

---

## 📚 API Reference

### Key Functions

```typescript
// Email
sendLargeExpenseAlert(expense) → Promise<boolean>

// Push
registerDeviceToken(userId, token, type, platform) → Promise<boolean>
sendPushToRoles(roles, payload) → Promise<boolean>
sendLargeExpensePush(expense) → Promise<boolean>

// Notifications
requestNotificationPermission() → Promise<boolean>
showLocalNotification(payload) → void
```

---

## ✅ Deployment Checklist

- [ ] Run EXPENSES_SYSTEM_SETUP.sql in Supabase
- [ ] Add all environment variables to `.env.local`
- [ ] Configure email service (Resend or SendGrid)
- [ ] Set up push notifications (FCM or OneSignal)
- [ ] Test email alerts with low threshold
- [ ] Test push notifications
- [ ] Update Sidebar to show Expenses link
- [ ] Verify Reports integration
- [ ] Test on mobile devices
- [ ] Deploy to production
- [ ] Monitor for errors in first 24 hours

---

## 🎉 You're Done!

Your expenses system is now fully functional with:
✅ Complete CRUD operations  
✅ Real-time updates  
✅ Email alerts  
✅ Push notifications  
✅ Reports integration  
✅ Role-based security  

---

**Developer:** Frank Bediako  
**Email:** frankbediako38@gmail.com  
**Version:** 1.0  
**Last Updated:** October 27, 2025

