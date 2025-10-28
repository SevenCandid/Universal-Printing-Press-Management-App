'use client';

import { useEffect, ReactNode } from 'react';
import { fetchAllCriticalData, setupPeriodicSync } from '@/lib/offlineSync';

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  useEffect(() => {
    // Initialize offline capabilities
    const initializeOffline = async () => {
      try {
        // Register service worker
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
              console.log('[OfflineProvider] Service Worker registered:', registration);
            })
            .catch((error) => {
              console.error('[OfflineProvider] Service Worker registration failed:', error);
            });
        }

        // Fetch initial data for offline use
        if (navigator.onLine) {
          console.log('[OfflineProvider] Fetching initial data...');
          await fetchAllCriticalData();
        }

        // Setup periodic sync (every 5 minutes)
        const cleanup = setupPeriodicSync(5 * 60 * 1000);

        return cleanup;
      } catch (error) {
        console.error('[OfflineProvider] Initialization failed:', error);
      }
    };

    const cleanup = initializeOffline();

    // Cleanup on unmount
    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then(fn => fn && fn());
      }
    };
  }, []);

  return <>{children}</>;
}

