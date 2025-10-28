# Offline Features Documentation

The Universal Printing Press app now supports **complete offline functionality**, allowing users to continue working even without an internet connection.

## Overview

The app uses:
- **Service Workers** for asset caching and offline page serving
- **IndexedDB** (via localforage) for offline data storage
- **Background Sync** for syncing queued operations when connection is restored
- **Network-First** strategy for API calls with automatic fallback to cache

## Key Features

### 1. **Automatic Data Caching**
When online, the app automatically caches:
- Orders (last 100)
- Expenses (last 100)
- Products (all)
- Staff Profiles (all)
- Invoices (last 50)
- Handbook content

### 2. **Offline Operations Queue**
When offline, any create/update/delete operations are:
- Queued locally using IndexedDB
- Automatically synced when connection is restored
- Tracked with a pending count indicator

### 3. **Offline Indicator**
A visual indicator shows:
- Connection status (online/offline)
- Number of pending sync operations
- Manual sync button
- Last sync timestamp

### 4. **Smart Caching Strategies**

#### Static Assets (CacheFirst)
- Images: 24 hours, max 64 entries
- Fonts: 1 year, max 4 entries
- Supabase Storage: 30 days, max 100 entries

#### API Calls (NetworkFirst)
- Supabase API: 5 minutes cache, 10s timeout
- Falls back to cache if network fails

#### Dynamic Content (StaleWhileRevalidate)
- JavaScript: 24 hours
- CSS: 24 hours
- Fonts: 1 week

## Usage

### For Users

#### Working Offline
1. **View Data**: All recently accessed data is available offline
2. **Create/Edit**: Changes are saved locally
3. **Sync**: Changes automatically sync when back online

#### Offline Indicator
- **Blue badge**: Online with pending changes
- **Red pulsing badge**: Offline mode
- Click the badge for details and manual sync

### For Developers

#### Using the Offline Hook

```typescript
import { useOffline } from '@/hooks/useOffline';

function MyComponent() {
  const { isOnline, pendingCount, sync, fetchData, queueOperation } = useOffline();

  // Check if online
  if (!isOnline) {
    return <p>You are offline</p>;
  }

  // Fetch data with offline fallback
  const loadData = async () => {
    const { data, fromCache } = await fetchData(
      () => supabase.from('orders').select('*'),
      STORAGE_KEYS.ORDERS
    );
    
    if (fromCache) {
      console.log('Using cached data');
    }
  };

  // Queue an offline operation
  const createOrder = async (orderData) => {
    if (!isOnline) {
      await queueOperation({
        type: 'CREATE',
        table: 'orders',
        data: orderData
      });
      toast.success('Order saved. Will sync when online.');
    } else {
      await supabase.from('orders').insert(orderData);
    }
  };

  // Manual sync
  const handleSync = async () => {
    await sync();
  };

  return (
    <div>
      <p>Pending: {pendingCount}</p>
      <button onClick={handleSync}>Sync Now</button>
    </div>
  );
}
```

#### Direct Storage Access

```typescript
import {
  saveOfflineData,
  getOfflineData,
  STORAGE_KEYS,
  addToSyncQueue
} from '@/lib/offlineStorage';

// Save data
await saveOfflineData(STORAGE_KEYS.ORDERS, ordersData);

// Retrieve data
const cachedOrders = await getOfflineData(STORAGE_KEYS.ORDERS);

// Queue operation
await addToSyncQueue({
  type: 'UPDATE',
  table: 'expenses',
  data: { id: 123, amount: 500 }
});
```

#### Sync Operations

```typescript
import {
  syncAllData,
  fetchAllCriticalData,
  isOnline
} from '@/lib/offlineSync';

// Check online status
if (isOnline()) {
  // Sync all queued operations
  const result = await syncAllData();
  console.log(`Synced: ${result.success}, Failed: ${result.failed}`);
  
  // Fetch fresh data
  await fetchAllCriticalData();
}
```

## Configuration

### Service Worker Caching

Edit `next.config.js` to customize caching strategies:

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /\/api\/.*$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
      },
    },
    // ... more strategies
  ],
});
```

### Storage Keys

All storage keys are defined in `src/lib/offlineStorage.ts`:

```typescript
export const STORAGE_KEYS = {
  ORDERS: 'offline_orders',
  EXPENSES: 'offline_expenses',
  PROFILES: 'offline_profiles',
  PRODUCTS: 'offline_products',
  INVOICES: 'offline_invoices',
  HANDBOOK: 'offline_handbook',
  USER_PROFILE: 'offline_user_profile',
  SYNC_QUEUE: 'offline_sync_queue',
  LAST_SYNC: 'offline_last_sync',
};
```

## Browser Support

### Required Features
- Service Workers
- IndexedDB
- LocalStorage
- Background Sync API (optional but recommended)

### Supported Browsers
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Partial (no Background Sync)
- Mobile browsers: Full support on modern versions

## Testing

### Test Offline Mode

1. **Chrome DevTools**:
   - Open DevTools (F12)
   - Go to "Network" tab
   - Select "Offline" from throttling dropdown

2. **Firefox DevTools**:
   - Open DevTools (F12)
   - Go to "Network" tab
   - Check "Offline" checkbox

3. **Manual Test**:
   - Disconnect from internet
   - Use the app normally
   - Reconnect and verify sync

### Verify Service Worker

1. Open DevTools
2. Go to "Application" > "Service Workers"
3. Check registration status
4. View cached resources in "Cache Storage"

### Check IndexedDB

1. Open DevTools
2. Go to "Application" > "IndexedDB"
3. Expand "UPP-Offline-DB"
4. View stored data

## Performance

### Cache Limits
- **Static Images**: 64 entries
- **API Responses**: 100 entries
- **Next.js Data**: 32 entries

### Storage Usage
Check storage usage:

```typescript
import { getStorageSize } from '@/lib/offlineStorage';

const size = await getStorageSize();
console.log(`Using ${size.usage} of ${size.quota} bytes`);
```

### Auto-Sync Interval
Default: Every 5 minutes when online

Customize in `src/components/providers/OfflineProvider.tsx`:

```typescript
// Sync every 10 minutes
const cleanup = setupPeriodicSync(10 * 60 * 1000);
```

## Troubleshooting

### Service Worker Not Registering
1. Check HTTPS (required for SW, except localhost)
2. Verify `public/sw.js` exists
3. Check browser console for errors

### Data Not Syncing
1. Check network connection
2. Open offline indicator for pending count
3. Click "Sync Now" manually
4. Check console for sync errors

### Cache Not Working
1. Clear browser cache
2. Unregister service worker
3. Hard refresh (Ctrl+Shift+R)
4. Re-register service worker

### Storage Quota Exceeded
1. Clear old cached data
2. Reduce cache limits in `next.config.js`
3. Implement cache cleanup strategy

## Security Considerations

1. **Sensitive Data**: Offline storage is not encrypted by default
2. **Authentication**: Tokens should have expiration
3. **Sync Conflicts**: Last-write-wins strategy is used
4. **Data Validation**: Always validate synced data on server

## Future Enhancements

- [ ] Conflict resolution for simultaneous edits
- [ ] Selective sync (user chooses what to sync)
- [ ] Data compression for offline storage
- [ ] Encryption for sensitive offline data
- [ ] Advanced cache invalidation strategies
- [ ] Offline-first forms with validation
- [ ] Download for offline use button

## Related Files

- `src/lib/offlineStorage.ts` - Storage utilities
- `src/lib/offlineSync.ts` - Sync operations
- `src/hooks/useOffline.ts` - React hook
- `src/components/ui/OfflineIndicator.tsx` - UI component
- `src/components/providers/OfflineProvider.tsx` - Provider component
- `public/sw-offline.js` - Custom service worker
- `next.config.js` - PWA configuration
- `public/manifest.json` - PWA manifest

## Support

For issues or questions about offline features:
1. Check browser console for errors
2. Review this documentation
3. Check service worker status in DevTools
4. Contact development team

