'use client'

import { useState, useEffect } from 'react'
import { BellIcon, BellSlashIcon } from '@heroicons/react/24/outline'
import { Button } from './button'
import { 
  requestNotificationPermission, 
  getNotificationStatus 
} from '@/lib/browserNotifications'
import toast from 'react-hot-toast'

export default function NotificationSettings() {
  const [notificationStatus, setNotificationStatus] = useState({
    supported: false,
    permission: 'default' as NotificationPermission | 'not-supported',
    enabled: false,
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    updateStatus()
  }, [])

  const updateStatus = () => {
    const status = getNotificationStatus()
    setNotificationStatus(status)
  }

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission()
    
    if (granted) {
      toast.success('🔔 Notifications enabled! You\'ll receive updates about forum activity.')
      updateStatus()
    } else {
      toast.error('Notification permission denied. You can enable it in your browser settings.')
    }
  }

  if (!mounted) {
    return null
  }

  if (!notificationStatus.supported) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BellSlashIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
              Notifications Not Supported
            </h3>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              Your browser doesn't support push notifications. Try using Chrome, Firefox, or Safari.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (notificationStatus.permission === 'denied') {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BellSlashIcon className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
              Notifications Blocked
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300 mb-2">
              You've blocked notifications for this site. To enable them:
            </p>
            <ol className="text-xs text-red-700 dark:text-red-300 space-y-1 ml-4">
              <li>1. Click the lock icon in your browser's address bar</li>
              <li>2. Find "Notifications" in site settings</li>
              <li>3. Change from "Block" to "Allow"</li>
              <li>4. Refresh this page</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  if (notificationStatus.enabled) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BellIcon className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
              ✅ Notifications Enabled
            </h3>
            <p className="text-xs text-green-700 dark:text-green-300">
              You'll receive browser notifications for:
            </p>
            <ul className="text-xs text-green-700 dark:text-green-300 mt-2 space-y-1 ml-4">
              <li>• New forum posts</li>
              <li>• CEO announcements (high priority)</li>
              <li>• Comments on your posts</li>
              <li>• Replies in discussions you're part of</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <BellIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
            Enable Push Notifications
          </h3>
          <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
            Get notified instantly about forum activity, just like WhatsApp! Works even when the app is closed.
          </p>
          <Button 
            onClick={handleEnableNotifications}
            size="sm"
            className="w-full sm:w-auto"
          >
            <BellIcon className="h-4 w-4 mr-2" />
            Enable Notifications
          </Button>
        </div>
      </div>
    </div>
  )
}




