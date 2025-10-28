# 📱 Mobile Notifications & App Badge Setup

## Overview
Mobile push notifications and app icon badge counting have been implemented to ensure notifications work on mobile devices and show unread counts on the app icon.

## What's New

### 1. Service Worker-Based Notifications
Mobile browsers require notifications to be sent through the service worker API, not the direct Notification API.

**Files Created:**
- `public/sw-custom.js` - Custom service worker for push notifications
- `src/lib/serviceWorkerNotifications.ts` - Service worker notification utilities
- `src/lib/badgeApi.ts` - App badge API utilities
- `src/components/providers/ServiceWorkerProvider.tsx` - Service worker initialization

### 2. App Icon Badge Counting
Shows the number of unread notifications directly on the app icon (home screen on mobile, taskbar/dock on desktop).

**Supported Platforms:**
- ✅ Android (Chrome, Edge, Samsung Internet)
- ✅ macOS (Chrome, Edge, Safari with PWA)
- ✅ Windows (Chrome, Edge with PWA)
- ❌ iOS Safari (Badge API not yet supported)

## Features Implemented

### Mobile Notifications
- ✅ Service worker-based push notifications
- ✅ Vibration support on mobile devices
- ✅ Notification click handling (opens the app)
- ✅ Custom notification icons and badges
- ✅ Fallback to regular notifications if service worker unavailable

### App Badge
- ✅ Real-time badge count updates
- ✅ Shows number of unread notifications
- ✅ Auto-clears when all notifications are read
- ✅ Updates when notifications are marked as read/deleted
- ✅ Persists across app restarts

## How It Works

### Notification Flow (Mobile)

1. **New Notification Created** (Database)
   ```sql
   INSERT INTO notifications (title, message, user_role, type, link)
   VALUES ('Order Created', '#1234 from ABC Company', 'ceo,manager', 'order', '/orders');
   ```

2. **Realtime Event Received** (Client)
   - GlobalNotifier detects new notification via Supabase Realtime
   - Adds to in-app notification list
   - Calculates unread count

3. **Service Worker Notification** (Mobile-Optimized)
   ```typescript
   await showServiceWorkerNotification({
     title: 'Order Created',
     body: '#1234 from ABC Company',
     icon: '/icons/icon-192x192.png',
     badge: '/icons/icon-192x192.png',
     vibrate: [200, 100, 200],
     data: { url: '/orders' },
   })
   ```

4. **Badge Update** (App Icon)
   ```typescript
   await setAppBadge(5) // Shows "5" on app icon
   ```

5. **User Clicks Notification**
   - Service worker intercepts click
   - Opens/focuses app
   - Navigates to notification link

### Badge Count Flow

```
New Notification → Unread Count++ → Badge Updated
Mark as Read → Unread Count-- → Badge Updated
Delete → Unread Count-- → Badge Updated
Mark All Read → Unread Count = 0 → Badge Cleared
```

## Code Changes

### GlobalNotifier.tsx
```typescript
// Before (Browser Notification API - doesn't work well on mobile)
new Notification(title, { body, icon, badge })

// After (Service Worker API - works on mobile)
await showServiceWorkerNotification({
  title,
  body,
  icon: '/icons/icon-192x192.png',
  badge: '/icons/icon-192x192.png',
  vibrate: [200, 100, 200],
  data: { url: link },
})

// Badge update on every notification change
const unreadCount = notifications.filter((n) => !n.read).length
updateBadgeCount(unreadCount)
```

### Badge API Usage
```typescript
import { setAppBadge, clearAppBadge } from '@/lib/badgeApi'

// Set badge to 5
await setAppBadge(5)

// Clear badge
await clearAppBadge()
```

## Testing Checklist

### Mobile Testing (Android)
1. [ ] Install app to home screen (Add to Home Screen)
2. [ ] Create a test notification from another user/role
3. [ ] Verify notification appears in notification tray
4. [ ] Verify phone vibrates (if not in silent mode)
5. [ ] Verify badge shows on app icon
6. [ ] Click notification → should open app
7. [ ] Mark notification as read → badge count decreases
8. [ ] Close app and verify badge persists

### Desktop Testing (PWA)
1. [ ] Install as PWA (Install icon in address bar)
2. [ ] Create test notification
3. [ ] Verify notification appears
4. [ ] Verify badge on taskbar/dock icon
5. [ ] Click notification → app focuses
6. [ ] Mark as read → badge updates
7. [ ] Close and reopen → badge persists

### Browser Testing (Without PWA)
1. [ ] Allow notifications when prompted
2. [ ] Create test notification
3. [ ] Verify browser notification appears
4. [ ] Verify badge NOT shown (requires PWA installation)

## Troubleshooting

### Notifications Not Showing on Mobile

**Possible Causes:**
1. **Permission Not Granted**
   - Check: Settings → Site Settings → Notifications
   - Fix: Prompt user to allow notifications

2. **App Not Installed to Home Screen**
   - Some features work better when installed as PWA
   - Fix: "Add to Home Screen" from browser menu

3. **Service Worker Not Registered**
   - Check: DevTools → Application → Service Workers
   - Fix: Clear cache and reload

4. **Browser Doesn't Support**
   - Check: Browser compatibility
   - Fix: Use Chrome/Edge on Android

### Badge Not Showing

**Possible Causes:**
1. **Badge API Not Supported**
   - iOS Safari doesn't support Badge API yet
   - Fix: No workaround, feature not available

2. **App Not Installed**
   - Badge only works for installed PWAs
   - Fix: Install app to home screen

3. **Permission Issues**
   - Check: Console for errors
   - Fix: Re-grant notifications permission

### Badge Count Wrong

**Possible Causes:**
1. **Cache Issue**
   - Badge count stored in localStorage
   - Fix: Clear site data and refresh

2. **Sync Issue**
   - Notifications may be out of sync
   - Fix: Refresh the page

## Browser Support

| Feature | Chrome Android | Safari iOS | Chrome Desktop | Safari Desktop |
|---------|---------------|------------|----------------|----------------|
| Service Worker Notifications | ✅ | ✅ | ✅ | ✅ |
| App Badge API | ✅ | ❌ | ✅ | ✅ (with PWA) |
| Vibration | ✅ | ❌ | ❌ | ❌ |
| Push (FCM) | ✅ | ⚠️ (APNs only) | ✅ | ⚠️ (APNs only) |

## Future Enhancements

1. **Web Push API (FCM/APNs)**
   - Send notifications even when app is closed
   - Requires backend integration
   - Already planned in `src/lib/pushNotify.ts`

2. **Notification Actions**
   - "Mark as Read" button in notification
   - "View Details" button
   - Inline reply for messages

3. **Notification Grouping**
   - Group similar notifications
   - "5 new orders" instead of 5 separate notifications

4. **Rich Notifications**
   - Images in notifications
   - Progress bars for tasks
   - Custom layouts

5. **Notification Scheduling**
   - Quiet hours (no notifications at night)
   - Priority levels
   - Snooze functionality

## Environment Variables (Optional)

For future Web Push implementation:
```env
# Firebase Cloud Messaging (Android/Web)
FCM_SERVER_KEY=your_fcm_server_key
NEXT_PUBLIC_FCM_VAPID_KEY=your_vapid_public_key

# OneSignal (Alternative)
NEXT_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_API_KEY=your_onesignal_api_key

# Push Provider (fcm or onesignal)
PUSH_PROVIDER=fcm
```

## Manifest.json

The PWA manifest already includes:
```json
{
  "name": "Universal Printing Press",
  "short_name": "UPP",
  "display": "standalone",
  "icons": [ /* ... */ ],
  "start_url": "/",
  "scope": "/"
}
```

This enables:
- App installation
- Standalone mode (looks like native app)
- Badge support (when installed)

## Related Files

- `src/components/GlobalNotifier.tsx` - Main notification component
- `src/lib/serviceWorkerNotifications.ts` - Service worker utilities
- `src/lib/badgeApi.ts` - Badge API utilities  
- `public/sw-custom.js` - Custom service worker
- `public/sw.js` - Main service worker (auto-generated by next-pwa)
- `public/manifest.json` - PWA manifest
- `next.config.js` - PWA configuration

---

**Status:** ✅ Feature Complete
**Date:** October 28, 2025
**Tested:** Pending mobile device testing

