// Offline Storage Utilities using IndexedDB
import localforage from 'localforage';

// Configure localforage
localforage.config({
  name: 'UPP-Offline-DB',
  version: 1.0,
  storeName: 'upp_data',
  description: 'Universal Printing Press Offline Data Storage'
});

// Storage keys
export const STORAGE_KEYS = {
  ORDERS: 'offline_orders',
  EXPENSES: 'offline_expenses',
  PROFILES: 'offline_profiles',
  PRODUCTS: 'offline_products',
  RENTAL_INVENTORY: 'offline_rental_inventory',
  INVOICES: 'offline_invoices',
  HANDBOOK: 'offline_handbook',
  USER_PROFILE: 'offline_user_profile',
  SYNC_QUEUE: 'offline_sync_queue',
  LAST_SYNC: 'offline_last_sync',
};

// Offline Queue Item
export interface OfflineQueueItem {
  id?: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

// Save data to offline storage
export async function saveOfflineData<T>(key: string, data: T): Promise<void> {
  try {
    await localforage.setItem(key, {
      data,
      timestamp: Date.now(),
    });
    // Only log in debug mode
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[OfflineStorage] Saved ${key}`);
    }
  } catch (error) {
    console.error(`[OfflineStorage] Error saving ${key}:`, error);
    throw error;
  }
}

// Get data from offline storage
export async function getOfflineData<T>(key: string): Promise<T | null> {
  try {
    const stored = await localforage.getItem<{ data: T; timestamp: number }>(key);
    if (stored) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[OfflineStorage] Retrieved ${key}`);
      }
      return stored.data;
    }
    return null;
  } catch (error) {
    console.error(`[OfflineStorage] Error getting ${key}:`, error);
    return null;
  }
}

// Remove data from offline storage
export async function removeOfflineData(key: string): Promise<void> {
  try {
    await localforage.removeItem(key);
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[OfflineStorage] Removed ${key}`);
    }
  } catch (error) {
    console.error(`[OfflineStorage] Error removing ${key}:`, error);
  }
}

// Clear all offline data
export async function clearAllOfflineData(): Promise<void> {
  try {
    await localforage.clear();
    console.log('[OfflineStorage] Cleared all data');
  } catch (error) {
    console.error('[OfflineStorage] Error clearing data:', error);
  }
}

// Add item to sync queue
export async function addToSyncQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'synced'>): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const newItem: OfflineQueueItem = {
      ...item,
      id: `${item.table}_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      synced: false,
    };
    queue.push(newItem);
    await saveOfflineData(STORAGE_KEYS.SYNC_QUEUE, queue);
    console.log('[OfflineStorage] Added to sync queue:', item.type, item.table);
  } catch (error) {
    console.error('[OfflineStorage] Error adding to sync queue:', error);
    throw error;
  }
}

// Get sync queue
export async function getSyncQueue(): Promise<OfflineQueueItem[]> {
  const queue = await getOfflineData<OfflineQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE);
  return queue || [];
}

// Mark queue item as synced
export async function markAsSynced(itemId: string): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const updatedQueue = queue.map(item => 
      item.id === itemId ? { ...item, synced: true } : item
    );
    await saveOfflineData(STORAGE_KEYS.SYNC_QUEUE, updatedQueue);
    if (process.env.NODE_ENV === 'development') {
      console.debug('[OfflineStorage] Marked as synced:', itemId);
    }
  } catch (error) {
    console.error('[OfflineStorage] Error marking as synced:', error);
  }
}

// Remove synced items from queue
export async function clearSyncedItems(): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const pendingQueue = queue.filter(item => !item.synced);
    await saveOfflineData(STORAGE_KEYS.SYNC_QUEUE, pendingQueue);
    if (process.env.NODE_ENV === 'development') {
      console.debug('[OfflineStorage] Cleared synced items');
    }
  } catch (error) {
    console.error('[OfflineStorage] Error clearing synced items:', error);
  }
}

// Get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  const queue = await getSyncQueue();
  return queue.filter(item => !item.synced).length;
}

// Update last sync timestamp
export async function updateLastSyncTime(): Promise<void> {
  await saveOfflineData(STORAGE_KEYS.LAST_SYNC, Date.now());
}

// Get last sync timestamp
export async function getLastSyncTime(): Promise<number | null> {
  return await getOfflineData<number>(STORAGE_KEYS.LAST_SYNC);
}

// Check if data is stale (older than 1 hour)
export async function isDataStale(key: string, maxAgeMs: number = 3600000): Promise<boolean> {
  try {
    const stored = await localforage.getItem<{ data: any; timestamp: number }>(key);
    if (!stored) return true;
    return Date.now() - stored.timestamp > maxAgeMs;
  } catch (error) {
    return true;
  }
}

// Export all data (for backup)
export async function exportAllData(): Promise<Record<string, any>> {
  const allData: Record<string, any> = {};
  const keys = await localforage.keys();
  
  for (const key of keys) {
    allData[key] = await localforage.getItem(key);
  }
  
  return allData;
}

// Import data (from backup)
export async function importData(data: Record<string, any>): Promise<void> {
  for (const [key, value] of Object.entries(data)) {
    await localforage.setItem(key, value);
  }
}

// Get storage size estimate
export async function getStorageSize(): Promise<{ usage: number; quota: number } | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return null;
}

