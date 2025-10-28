// Offline Sync Service
import { supabase } from '@/lib/supabaseClient';
import {
  getSyncQueue,
  markAsSynced,
  clearSyncedItems,
  updateLastSyncTime,
  saveOfflineData,
  getOfflineData,
  STORAGE_KEYS,
} from './offlineStorage';

// Check if online
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

// Sync all pending operations
export async function syncAllData(): Promise<{ success: number; failed: number }> {
  if (!isOnline()) {
    console.log('[OfflineSync] Cannot sync - offline');
    return { success: 0, failed: 0 };
  }
  const queue = await getSyncQueue();
  const pendingItems = queue.filter(item => !item.synced);

  let successCount = 0;
  let failedCount = 0;

  if (pendingItems.length > 0) {
    console.log(`[OfflineSync] Syncing ${pendingItems.length} queued operation(s)`);
  }

  for (const item of pendingItems) {
    try {
      switch (item.type) {
        case 'CREATE':
          await supabase.from(item.table).insert(item.data);
          break;
        case 'UPDATE':
          await supabase.from(item.table).update(item.data).eq('id', item.data.id);
          break;
        case 'DELETE':
          await supabase.from(item.table).delete().eq('id', item.data.id);
          break;
      }
      
      if (item.id) {
        await markAsSynced(item.id);
      }
      successCount++;
      console.log(`[OfflineSync] ✓ Synced ${item.type} on ${item.table}`);
    } catch (error) {
      console.error(`[OfflineSync] ✗ Failed to sync ${item.type} on ${item.table}:`, error);
      failedCount++;
    }
  }

  // Clean up synced items
  await clearSyncedItems();
  
  // Update last sync time
  if (successCount > 0) {
    await updateLastSyncTime();
  }

  if (successCount > 0 || failedCount > 0) {
    console.log(`[OfflineSync] Sync complete: ${successCount} succeeded, ${failedCount} failed`);
  }
  return { success: successCount, failed: failedCount };
}

// Sync specific table data from server
export async function syncTableData(table: string, storageKey: string): Promise<boolean> {
  if (!isOnline()) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    await saveOfflineData(storageKey, data);
    console.log(`[OfflineSync] Synced ${table} data`);
    return true;
  } catch (error) {
    console.error(`[OfflineSync] Failed to sync ${table}:`, error);
    return false;
  }
}

// Fetch all critical data for offline use
export async function fetchAllCriticalData(): Promise<void> {
  if (!isOnline()) {
    console.log('[OfflineSync] Cannot fetch - offline');
    return;
  }

  try {
    // Helper function to safely fetch table data
    const safeFetch = async (table: string, storageKey: string, options: {
      limit?: number;
      orderBy?: string;
    } = {}) => {
      try {
        let query = supabase.from(table).select('*');
        
        if (options.orderBy) {
          query = query.order(options.orderBy, { ascending: false });
        }
        
        if (options.limit) {
          query = query.limit(options.limit);
        }
        
        const { data, error } = await query;
        
        if (error) {
          // Only log if it's not a "table doesn't exist" error
          if (!error.message.includes('does not exist') && error.code !== 'PGRST204') {
            console.warn(`[OfflineSync] Could not fetch ${table}:`, error.message);
          }
          return;
        }
        
        if (data && data.length > 0) {
          await saveOfflineData(storageKey, data);
          console.log(`[OfflineSync] Cached ${data.length} ${table} records`);
        }
      } catch (err) {
        // Silently fail for missing tables
        console.debug(`[OfflineSync] Skipping ${table} (table may not exist)`);
      }
    };

    // Fetch critical tables (only those that exist)
    await safeFetch('orders', STORAGE_KEYS.ORDERS, { limit: 100, orderBy: 'created_at' });
    await safeFetch('expenses', STORAGE_KEYS.EXPENSES, { limit: 100, orderBy: 'created_at' });
    await safeFetch('profiles', STORAGE_KEYS.PROFILES);
    await safeFetch('products', STORAGE_KEYS.PRODUCTS);
    await safeFetch('invoices', STORAGE_KEYS.INVOICES, { limit: 50, orderBy: 'created_at' });

    await updateLastSyncTime();
    console.log('[OfflineSync] Critical data sync completed');
  } catch (error) {
    console.error('[OfflineSync] Error during data sync:', error);
  }
}

// Get data with offline fallback
export async function getDataWithOfflineFallback<T>(
  fetchFn: () => Promise<T>,
  storageKey: string
): Promise<{ data: T | null; fromCache: boolean }> {
  if (isOnline()) {
    try {
      const data = await fetchFn();
      // Save to cache for offline use
      await saveOfflineData(storageKey, data);
      return { data, fromCache: false };
    } catch (error) {
      console.error('[OfflineSync] Fetch failed, using cache:', error);
      const cachedData = await getOfflineData<T>(storageKey);
      return { data: cachedData, fromCache: true };
    }
  } else {
    // Offline - use cached data
    const cachedData = await getOfflineData<T>(storageKey);
    return { data: cachedData, fromCache: true };
  }
}

// Register background sync
export async function registerBackgroundSync(): Promise<void> {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      // Type assertion for background sync API
      const syncManager = (registration as any).sync;
      if (syncManager) {
        await syncManager.register('sync-offline-queue');
        console.log('[OfflineSync] Background sync registered');
      }
    } catch (error) {
      console.error('[OfflineSync] Background sync registration failed:', error);
    }
  }
}

// Setup periodic sync (when online)
export function setupPeriodicSync(intervalMs: number = 300000): () => void {
  let intervalId: NodeJS.Timeout;

  const sync = async () => {
    if (isOnline()) {
      await syncAllData();
      await fetchAllCriticalData();
    }
  };

  // Initial sync
  sync();

  // Setup interval
  intervalId = setInterval(sync, intervalMs);

  // Return cleanup function
  return () => clearInterval(intervalId);
}

