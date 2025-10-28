'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { syncAllData, isOnline } from '@/lib/offlineSync';
import { getPendingSyncCount } from '@/lib/offlineStorage';
import { Button } from './button';

export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Set initial status
    setOnline(isOnline());

    // Update pending count
    const updatePendingCount = async () => {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    };
    updatePendingCount();

    // Listen for online/offline events
    const handleOnline = () => {
      setOnline(true);
      // Auto-sync when coming back online
      handleSync();
    };

    const handleOffline = () => {
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check for pending items
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (!online) return;
    
    setSyncing(true);
    try {
      const result = await syncAllData();
      console.log('Sync result:', result);
      
      // Update pending count
      const count = await getPendingSyncCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (online && pendingCount === 0) {
    return null; // Don't show anything when online and synced
  }

  return (
    <>
      {/* Compact indicator */}
      <div
        className="fixed bottom-4 right-4 z-50 cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all duration-300 ${
            online
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
              : 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 animate-pulse'
          }`}
        >
          {online ? (
            <>
              {syncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4" />
              )}
              {pendingCount > 0 && (
                <span className="text-xs font-semibold">
                  {pendingCount} pending
                </span>
              )}
            </>
          ) : (
            <>
              <CloudOff className="h-4 w-4" />
              <span className="text-xs font-semibold">Offline Mode</span>
            </>
          )}
        </div>
      </div>

      {/* Details panel */}
      {showDetails && (
        <div className="fixed bottom-20 right-4 z-50 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Connection Status
            </h3>
            <button
              onClick={() => setShowDetails(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            {/* Status */}
            <div className="flex items-center gap-2">
              {online ? (
                <>
                  <Wifi className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Connected to internet
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-red-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    No internet connection
                  </span>
                </>
              )}
            </div>

            {/* Pending sync count */}
            {pendingCount > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  {pendingCount} change{pendingCount !== 1 ? 's' : ''} waiting to sync
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {online
                    ? 'Will sync automatically'
                    : 'Will sync when connection is restored'}
                </p>
              </div>
            )}

            {/* Offline message */}
            {!online && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  You can continue working offline. Your changes will be saved and synced when you're back online.
                </p>
              </div>
            )}

            {/* Sync button */}
            {online && pendingCount > 0 && (
              <Button
                onClick={handleSync}
                disabled={syncing}
                className="w-full"
                size="sm"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

