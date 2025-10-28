'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  isOnline as checkOnline,
  syncAllData,
  fetchAllCriticalData,
  getDataWithOfflineFallback,
} from '@/lib/offlineSync';
import {
  addToSyncQueue,
  getPendingSyncCount,
  getLastSyncTime,
} from '@/lib/offlineStorage';

export interface UseOfflineReturn {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
  sync: () => Promise<void>;
  fetchData: <T>(fetchFn: () => Promise<T>, storageKey: string) => Promise<{ data: T | null; fromCache: boolean }>;
  queueOperation: (operation: {
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    table: string;
    data: any;
  }) => Promise<void>;
}

export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Update online status
  const updateOnlineStatus = useCallback(() => {
    setIsOnline(checkOnline());
  }, []);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    const count = await getPendingSyncCount();
    setPendingCount(count);
  }, []);

  // Update last sync time
  const updateLastSync = useCallback(async () => {
    const time = await getLastSyncTime();
    setLastSyncTime(time);
  }, []);

  // Sync all data
  const sync = useCallback(async () => {
    if (!checkOnline()) {
      console.log('[useOffline] Cannot sync - offline');
      return;
    }

    setIsSyncing(true);
    try {
      // Sync queued operations
      await syncAllData();
      
      // Fetch latest data
      await fetchAllCriticalData();
      
      // Update stats
      await updatePendingCount();
      await updateLastSync();
    } catch (error) {
      console.error('[useOffline] Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [updatePendingCount, updateLastSync]);

  // Fetch data with offline fallback
  const fetchData = useCallback(async <T,>(
    fetchFn: () => Promise<T>,
    storageKey: string
  ): Promise<{ data: T | null; fromCache: boolean }> => {
    return await getDataWithOfflineFallback(fetchFn, storageKey);
  }, []);

  // Queue operation for later sync
  const queueOperation = useCallback(async (operation: {
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    table: string;
    data: any;
  }) => {
    await addToSyncQueue(operation);
    await updatePendingCount();
  }, [updatePendingCount]);

  useEffect(() => {
    // Set initial status
    updateOnlineStatus();
    updatePendingCount();
    updateLastSync();

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Auto-sync when coming back online
    const handleOnline = async () => {
      updateOnlineStatus();
      await sync();
    };

    window.addEventListener('online', handleOnline);

    // Periodic updates
    const interval = setInterval(() => {
      updateOnlineStatus();
      updatePendingCount();
    }, 10000); // Every 10 seconds

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [updateOnlineStatus, updatePendingCount, updateLastSync, sync]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    sync,
    fetchData,
    queueOperation,
  };
}

