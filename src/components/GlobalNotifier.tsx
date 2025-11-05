'use client'

import { useEffect, useRef, createContext, useContext, useState, ReactNode } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { RealtimeChannel } from '@supabase/supabase-js'
import { showServiceWorkerNotification, requestNotificationPermission as requestSWPermission } from '@/lib/serviceWorkerNotifications'
import { setAppBadge } from '@/lib/badgeApi'

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
    const granted = await requestSWPermission()
    setPermissionGranted(granted)
    
    if (granted) {
      console.log('✅ Notification permission granted')
    }
  }

  // ====== Show Native Notification ======
  const showNativeNotification = async (title: string, body: string, link?: string) => {
    if (!permissionGranted) return

    try {
      // Ensure service worker is ready before showing notification
      if ('serviceWorker' in navigator) {
        try {
          // Wait for service worker to be ready (important for mobile)
          await navigator.serviceWorker.ready
          console.log('✅ Service worker ready for notification')
        } catch (swError) {
          console.warn('⚠️ Service worker not ready, using fallback:', swError)
        }
      }

      // Use service worker notification for better mobile support
      const shown = await showServiceWorkerNotification({
        title,
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'upp-notification',
        vibrate: [200, 100, 200],
        data: { url: link || '/' },
      })
      
      if (!shown) {
        console.warn('⚠️ Service worker notification failed, trying fallback')
        // Fallback to regular notification API
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: 'upp-notification',
          })
        }
      }
    } catch (err) {
      console.error('Notification error:', err)
      // Final fallback: try regular notification API
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
          })
        }
      } catch (fallbackErr) {
        console.error('Fallback notification also failed:', fallbackErr)
      }
    }
  }
  
  // ====== Update App Badge Count ======
  const updateBadgeCount = (count: number) => {
    setAppBadge(count).catch((err) => {
      console.warn('Could not update badge:', err)
    })
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
    const targetRoles = (newRecord.user_role?.toLowerCase() || 'all').trim()

    // Check if user should see this notification
    // Handle 'all', comma-separated roles (e.g., 'ceo,manager,staff'), and single role
    if (targetRoles !== 'all') {
      const roleList = targetRoles.split(',').map(r => r.trim())
      if (!roleList.includes(userRole)) {
        console.log('🔔 Notification filtered out:', {
          userRole,
          targetRoles,
          roleList,
          notification: newRecord.title
        })
        return // Skip this notification
      }
    }
    
    console.log('🔔 Notification accepted:', {
      userRole,
      targetRoles,
      notification: newRecord.title
    })

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
        showNativeNotification(newNotification.title, newNotification.message, newNotification.link)
      }

      const newList = [newNotification, ...prev].slice(0, 50)
      
      // Update badge count with unread notifications
      const unreadCount = newList.filter((n) => !n.read).length
      updateBadgeCount(unreadCount)
      
      return newList
    })
  }
  // 🔔 Notification System END

  // ====== Fetch Existing Notifications ======
  const fetchNotifications = async () => {
    if (!supabase || !session) return

    try {
      const userRole = localStorage.getItem('role')?.toLowerCase() || ''
      
      // Build query to fetch notifications for user's role
      // Handle 'all', single role, and comma-separated roles
      let query = supabase
        .from('notifications')
        .select('*')
      
      // Filter: user_role = 'all' OR user_role contains the user's role
      // For comma-separated roles like 'ceo,manager,staff', check if user's role is included
      query = query.or(`user_role.eq.all,user_role.ilike.%${userRole}%`)
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching notifications:', error)
        return
      }
      
      // Additional client-side filtering for comma-separated roles
      // This ensures staff users see notifications even if user_role is 'ceo,manager,staff'
      const filteredData = data?.filter((n) => {
        const targetRoles = (n.user_role?.toLowerCase() || 'all').trim()
        if (targetRoles === 'all') return true
        const roleList = targetRoles.split(',').map(r => r.trim())
        return roleList.includes(userRole)
      }) || []
      
      console.log('🔔 Fetched notifications:', {
        userRole,
        total: data?.length || 0,
        filtered: filteredData.length,
        sampleRoles: data?.slice(0, 3).map(n => n.user_role)
      })

      if (filteredData) {
        const mappedNotifications: InAppNotification[] = filteredData.map((n) => ({
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
        
        // Update badge with unread count
        const unreadCount = mappedNotifications.filter((n) => !n.read).length
        updateBadgeCount(unreadCount)
      }
    } catch (err) {
      console.error('Error loading notifications:', err)
    }
  }

  // ====== Context Methods ======
  const markAsRead = async (id: string) => {
    // Update locally immediately for instant feedback
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      const unreadCount = updated.filter((n) => !n.read).length
      updateBadgeCount(unreadCount)
      return updated
    })
    
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
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }))
      updateBadgeCount(0) // All read, so badge is 0
      return updated
    })
    
    // Update in database
    if (supabase) {
      try {
        const userRole = localStorage.getItem('role')?.toLowerCase() || ''
        
        // Fetch all notifications for this user's role first
        const { data: allNotifications } = await supabase
          .from('notifications')
          .select('id, user_role')
          .or(`user_role.eq.all,user_role.ilike.%${userRole}%`)
        
        // Filter client-side to get only notifications that match user's role
        const matchingNotifications = allNotifications?.filter((n) => {
          const targetRoles = (n.user_role?.toLowerCase() || 'all').trim()
          if (targetRoles === 'all') return true
          const roleList = targetRoles.split(',').map(r => r.trim())
          return roleList.includes(userRole)
        }) || []
        
        // Update only the matching notifications
        if (matchingNotifications.length > 0) {
          const ids = matchingNotifications.map(n => n.id)
          await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', ids)
        }
      } catch (err) {
        console.error('Error marking all as read:', err)
      }
    }
  }

  const clearNotification = async (id: string) => {
    // Delete from database first (before updating local state)
    if (supabase) {
      try {
        const { error, data } = await supabase
          .from('notifications')
          .delete()
          .eq('id', id)
          .select()
        
        if (error) {
          console.error('Error deleting notification:', error)
          // Show error to user
          if (error.code === '42501' || error.message.includes('permission')) {
            console.error('Permission denied: DELETE policy may be missing on notifications table')
          }
          // Don't remove from local state if delete failed
          return
        }
        
        // Only remove locally if database delete succeeded
        setNotifications((prev) => {
          const updated = prev.filter((n) => n.id !== id)
          const unreadCount = updated.filter((n) => !n.read).length
          updateBadgeCount(unreadCount)
          return updated
        })
      } catch (err) {
        console.error('Error deleting notification:', err)
        // Don't remove from local state if delete failed
        return
      }
    } else {
      // If no supabase, still remove locally (for offline mode)
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== id)
        const unreadCount = updated.filter((n) => !n.read).length
        updateBadgeCount(unreadCount)
        return updated
      })
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

