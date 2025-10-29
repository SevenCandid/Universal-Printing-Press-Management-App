// =====================================================
// BROWSER PUSH NOTIFICATIONS (Like WhatsApp)
// =====================================================
// Handles browser push notifications for forum posts/comments
// Works on desktop and mobile browsers
// =====================================================

/**
 * Request permission for browser notifications
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission === 'denied') {
    console.warn('Notification permission denied by user')
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}

/**
 * Check if notifications are supported and permitted
 */
export function canShowNotifications(): boolean {
  if (!('Notification' in window)) {
    return false
  }
  return Notification.permission === 'granted'
}

/**
 * Show a browser notification
 */
export function showBrowserNotification(
  title: string,
  options?: {
    body?: string
    icon?: string
    badge?: string
    tag?: string
    data?: any
    requireInteraction?: boolean
    silent?: boolean
  }
): Notification | null {
  if (!canShowNotifications()) {
    return null
  }

  try {
    const notification = new Notification(title, {
      icon: options?.icon || '/icon-192x192.png',
      badge: options?.badge || '/icon-192x192.png',
      body: options?.body || '',
      tag: options?.tag || 'uppress-notification',
      data: options?.data || {},
      requireInteraction: options?.requireInteraction || false,
      silent: options?.silent || false,
      // Note: vibrate is supported by some browsers but not in TypeScript types
    } as NotificationOptions)

    // Handle notification click
    notification.onclick = (event) => {
      event.preventDefault()
      window.focus()
      
      // Navigate to link if provided in data
      if (options?.data?.link) {
        window.location.href = options.data.link
      }
      
      notification.close()
    }

    return notification
  } catch (error) {
    console.error('Error showing notification:', error)
    return null
  }
}

/**
 * Show forum post notification
 */
export function showForumPostNotification(
  authorName: string,
  postTitle: string,
  postId: string,
  isAnnouncement: boolean = false
) {
  const title = isAnnouncement ? '📢 New Announcement' : '💬 New Forum Post'
  const body = `${authorName} posted: ${postTitle}`

  showBrowserNotification(title, {
    body,
    tag: `forum-post-${postId}`,
    data: {
      type: 'forum_post',
      postId,
      link: `/forum?post=${postId}`,
    },
    requireInteraction: isAnnouncement, // Announcements require user interaction
  })
}

/**
 * Show forum comment notification
 */
export function showForumCommentNotification(
  commenterName: string,
  postTitle: string,
  postId: string
) {
  const title = '💬 New Comment'
  const body = `${commenterName} commented on: ${postTitle}`

  showBrowserNotification(title, {
    body,
    tag: `forum-comment-${postId}`,
    data: {
      type: 'forum_comment',
      postId,
      link: `/forum?post=${postId}`,
    },
  })
}

/**
 * Show CEO announcement notification (high priority)
 */
export function showAnnouncementNotification(
  authorName: string,
  announcementTitle: string,
  postId: string
) {
  showBrowserNotification('📢 Important Announcement', {
    body: `${authorName}: ${announcementTitle}`,
    tag: `announcement-${postId}`,
    data: {
      type: 'announcement',
      postId,
      link: `/forum?post=${postId}`,
    },
    requireInteraction: true, // Force user to acknowledge
  })
}

/**
 * Initialize notification system on app load
 */
export function initializeNotifications() {
  // Request permission on first visit (don't spam user)
  if ('Notification' in window && Notification.permission === 'default') {
    console.log('Notifications available - user can enable in settings')
  }

  // Log current status
  console.log('Notification Status:', {
    supported: 'Notification' in window,
    permission: Notification?.permission || 'not-supported',
    enabled: canShowNotifications(),
  })
}

/**
 * Get notification permission status
 */
export function getNotificationStatus(): {
  supported: boolean
  permission: NotificationPermission | 'not-supported'
  enabled: boolean
} {
  return {
    supported: 'Notification' in window,
    permission: Notification?.permission || 'not-supported',
    enabled: canShowNotifications(),
  }
}

