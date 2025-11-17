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
        // Only register service worker in production (PWA is disabled in dev)
        if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
              console.log('[OfflineProvider] Service Worker registered:', registration);
            })
            .catch((error) => {
              // Silently fail in production - service worker errors are non-critical
              console.debug('[OfflineProvider] Service Worker registration failed:', error);
            });
        } else if (process.env.NODE_ENV === 'development') {
          // Unregister any existing service workers in dev mode
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
              registrations.forEach((registration) => {
                registration.unregister().catch(() => {
                  // Silently handle unregistration errors
                });
              });
            });
          }
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

