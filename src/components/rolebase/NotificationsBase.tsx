'use client'

import { useState, useRef, useEffect } from 'react'
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { BellAlertIcon } from '@heroicons/react/24/solid'
import { useNotifications, InAppNotification } from '@/components/GlobalNotifier'
import { cn } from '@/lib/utils'
import { Dialog } from '@headlessui/react'

export default function NotificationsBase() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<InAppNotification | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ====== Close on Outside Click ======
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // ====== Format Time Ago ======
  const timeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  // ====== Handle Notification Click ======
  const handleNotificationClick = (notification: InAppNotification) => {
    // Mark as read first to update count immediately
    markAsRead(notification.id)
    setSelectedNotification(notification)
    setIsModalOpen(true)
    setIsOpen(false) // Close dropdown
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 🔔 Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 md:p-2 hover:bg-muted rounded-lg transition-colors"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
        ) : (
          <BellIcon className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
        )}

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 md:top-1 md:right-1 flex items-center justify-center w-4 h-4 md:w-5 md:h-5 bg-red-500 text-white text-[10px] md:text-xs font-bold rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 🔔 Dropdown */}
      {isOpen && (
        <div className="fixed md:absolute top-full md:top-auto right-0 left-0 md:left-auto md:right-0 md:mt-2 w-full md:w-96 bg-card border border-border md:rounded-lg shadow-2xl z-[100] max-h-[calc(100vh-4rem)] md:max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 md:p-4 border-b border-border bg-muted/30">
            <h3 className="text-sm md:text-base font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Mark all
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-muted rounded"
                aria-label="Close"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-6 md:p-8 text-center text-muted-foreground">
                <BellIcon className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm md:text-base">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-3 md:p-4 hover:bg-muted/40 cursor-pointer transition-colors relative group',
                      !notification.read && 'bg-primary/5'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Unread Indicator */}
                    {!notification.read && (
                      <div className="absolute left-1.5 md:left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full"></div>
                    )}

                    <div className={cn('flex items-start gap-2 md:gap-3', !notification.read && 'ml-3 md:ml-4')}>
                      {/* Icon based on type */}
                      <div className="flex-shrink-0 mt-0.5 md:mt-1">
                        {notification.type === 'order' && (
                          <span className="text-xl md:text-2xl">🧾</span>
                        )}
                        {notification.type === 'task' && (
                          <span className="text-xl md:text-2xl">✅</span>
                        )}
                        {notification.type === 'general' && (
                          <span className="text-xl md:text-2xl">🔔</span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-semibold text-foreground mb-0.5 md:mb-1 line-clamp-2">
                          {notification.title}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(notification.timestamp)}
                        </p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          clearNotification(notification.id)
                        }}
                        className="flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                        aria-label="Remove notification"
                      >
                        <XMarkIcon className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* 📋 Notification Detail Modal */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="relative z-[200]"
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

        {/* Modal Container */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md md:max-w-lg bg-card rounded-lg shadow-2xl border border-border overflow-hidden">
            {selectedNotification && (
              <>
                {/* Header */}
                <div className="flex items-start justify-between p-4 md:p-6 border-b border-border bg-muted/30">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {selectedNotification.type === 'order' && (
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                          <span className="text-2xl md:text-3xl">🧾</span>
                        </div>
                      )}
                      {selectedNotification.type === 'task' && (
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                          <span className="text-2xl md:text-3xl">✅</span>
                        </div>
                      )}
                      {selectedNotification.type === 'general' && (
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-500/10 rounded-full flex items-center justify-center">
                          <span className="text-2xl md:text-3xl">🔔</span>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <Dialog.Title className="text-base md:text-lg font-semibold text-foreground">
                        {selectedNotification.title}
                      </Dialog.Title>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        {timeAgo(selectedNotification.timestamp)}
                      </p>
                    </div>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-shrink-0 p-1.5 hover:bg-muted rounded-lg transition-colors ml-2"
                    aria-label="Close"
                  >
                    <XMarkIcon className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 md:p-6 space-y-4">
                  {/* Message */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Message
                    </h4>
                    <p className="text-sm md:text-base text-foreground leading-relaxed">
                      {selectedNotification.message}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Type
                      </p>
                      <p className="text-sm text-foreground capitalize">
                        {selectedNotification.type}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Status
                      </p>
                      <p className="text-sm text-foreground">
                        {selectedNotification.read ? (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                            <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"></span>
                            Read
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <span className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></span>
                            Unread
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      Received on {selectedNotification.timestamp.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 p-4 md:p-6 border-t border-border bg-muted/20">
                  <button
                    onClick={() => {
                      clearNotification(selectedNotification.id)
                      setIsModalOpen(false)
                    }}
                    className="flex-1 px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors font-medium text-sm"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  )
}

