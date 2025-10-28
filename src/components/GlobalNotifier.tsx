'use client'

import { useEffect, useRef, createContext, useContext, useState, ReactNode } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { RealtimeChannel } from '@supabase/supabase-js'

// ====== Notification Types ======
export type NotificationType = 'order' | 'task' | 'general'

export type InAppNotification = {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  link?: string
  read: boolean
}

type NotificationContextType = {
  notifications: InAppNotification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
}

// ====== Context ======
const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within GlobalNotifier')
  }
  return context
}

// ====== Main Component ======
export default function GlobalNotifier({ children }: { children?: ReactNode }) {
  const { supabase, session } = useSupabase()
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [permissionGranted, setPermissionGranted] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [loaded, setLoaded] = useState(false)

  // ====== Request Browser Notification Permission ======
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications')
      return
    }

    if (Notification.permission === 'granted') {
      setPermissionGranted(true)
      return
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setPermissionGranted(true)
      }
    }
  }

  // ====== Show Native Notification ======
  const showNativeNotification = (title: string, body: string, icon?: string) => {
    if (!permissionGranted || !('Notification' in window)) return

    try {
      new Notification(title, {
        body,
        icon: icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'upp-notification',
      })
    } catch (err) {
      console.error('Native notification error:', err)
    }
  }

  // ====== Add In-App Notification ======
  const addNotification = (notification: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: InAppNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    }

    setNotifications((prev) => [newNotification, ...prev].slice(0, 50)) // Keep only last 50
    return newNotification
  }

  // 🔔 Notification System START
  // ====== Handle Notification Insert ======
  const handleNotificationInsert = (payload: any) => {
    const { new: newRecord } = payload

    // Check if notification is for this user's role
    const userRole = localStorage.getItem('role')?.toLowerCase() || ''
    const targetRoles = newRecord.user_role?.toLowerCase() || 'all'

    // Check if user should see this notification
    if (targetRoles !== 'all' && !targetRoles.includes(userRole)) {
      return // Skip this notification
    }

    // Check if notification already exists (avoid duplicates)
    setNotifications((prev) => {
      const exists = prev.some((n) => n.id === newRecord.id)
      if (exists) return prev

      // Add new notification
      const newNotification: InAppNotification = {
        id: newRecord.id,
        type: newRecord.type || 'general',
        title: newRecord.title,
        message: newRecord.message,
        timestamp: new Date(newRecord.created_at),
        link: newRecord.link || '/',
        read: newRecord.read || false,
      }

      // Show native browser notification only for unread
      if (!newNotification.read) {
        showNativeNotification(newNotification.title, newNotification.message)
      }

      return [newNotification, ...prev].slice(0, 50)
    })
  }
  // 🔔 Notification System END

  // ====== Fetch Existing Notifications ======
  const fetchNotifications = async () => {
    if (!supabase || !session) return

    try {
      const userRole = localStorage.getItem('role')?.toLowerCase() || ''
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_role.eq.all,user_role.ilike.%${userRole}%`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching notifications:', error)
        return
      }

      if (data) {
        const mappedNotifications: InAppNotification[] = data.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          timestamp: new Date(n.created_at),
          link: n.link,
          read: n.read || false,
        }))
        setNotifications(mappedNotifications)
        setLoaded(true)
      }
    } catch (err) {
      console.error('Error loading notifications:', err)
    }
  }

  // ====== Context Methods ======
  const markAsRead = async (id: string) => {
    // Update locally immediately for instant feedback
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    
    // Update in database
    if (supabase) {
      try {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id)
      } catch (err) {
        console.error('Error marking notification as read:', err)
      }
    }
  }

  const markAllAsRead = async () => {
    // Update locally
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    
    // Update in database
    if (supabase) {
      try {
        const userRole = localStorage.getItem('role')?.toLowerCase() || ''
        await supabase
          .from('notifications')
          .update({ read: true })
          .or(`user_role.eq.all,user_role.ilike.%${userRole}%`)
      } catch (err) {
        console.error('Error marking all as read:', err)
      }
    }
  }

  const clearNotification = async (id: string) => {
    // Remove locally
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    
    // Delete from database
    if (supabase) {
      try {
        await supabase
          .from('notifications')
          .delete()
          .eq('id', id)
      } catch (err) {
        console.error('Error deleting notification:', err)
      }
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  // ====== Load Notifications on Mount ======
  useEffect(() => {
    if (!supabase || !session) return
    if (!loaded) {
      fetchNotifications()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, session])

  // ====== Setup Realtime Subscriptions ======
  useEffect(() => {
    if (!supabase || !session || !loaded) return

    // Request permission on mount
    requestNotificationPermission()

    // 🔔 Notification System START
    // Subscribe to notifications table inserts and updates
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => handleNotificationInsert(payload)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          const { new: updated } = payload
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === updated.id ? { ...n, read: updated.read } : n
            )
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        (payload) => {
          const { old: deleted } = payload
          setNotifications((prev) => prev.filter((n) => n.id !== deleted.id))
        }
      )
      .subscribe()

    channelRef.current = channel
    // 🔔 Notification System END

    return () => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
        } catch (err) {
          console.error('Error removing channel:', err)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, session, loaded])

  // ====== Provide Context ======
  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}

