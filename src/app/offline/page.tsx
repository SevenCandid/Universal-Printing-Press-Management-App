import { CloudOff, RefreshCw, Wifi } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
            <CloudOff className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            You're Offline
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            No internet connection detected. Don't worry, you can still access your cached data.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-left">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              What you can do offline:
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• View recently accessed orders and invoices</li>
              <li>• Check expense records</li>
              <li>• Browse product catalog</li>
              <li>• Read handbook and documentation</li>
              <li>• Create new entries (will sync when online)</li>
            </ul>
          </div>

          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-left">
            <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              <Wifi className="h-4 w-4 inline mr-1" />
              Reconnection Tips:
            </h3>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• Check your WiFi or mobile data connection</li>
              <li>• Try refreshing the page</li>
              <li>• Contact your network administrator if the issue persists</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Connection
            </button>
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Your changes are being saved locally and will automatically sync when you're back online.
          </p>
        </div>
      </div>
    </div>
  );
}

