// Service Worker-based notifications for better mobile support

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  vibrate?: number[];
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

/**
 * Show notification via service worker (better mobile support)
 */
export async function showServiceWorkerNotification(
  options: NotificationOptions
): Promise<boolean> {
  try {
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Worker not supported');
      return false;
    }

    // Check notification permission
    if (Notification.permission !== 'granted') {
      console.warn('⚠️ Notification permission not granted');
      return false;
    }

    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;

    // Show notification via service worker
    const notificationOptions: any = {
      body: options.body,
      icon: options.icon || '/icons/icon-192x192.png',
      badge: options.badge || '/icons/icon-192x192.png',
      tag: options.tag || 'upp-notification',
      data: options.data || {},
      requireInteraction: options.requireInteraction || false,
      vibrate: options.vibrate || [200, 100, 200],
      actions: options.actions || [],
      silent: false,
    };
    
    await registration.showNotification(options.title, notificationOptions);

    console.log('✅ Service worker notification shown');
    return true;
  } catch (error) {
    console.error('❌ Error showing service worker notification:', error);
    
    // Fallback to regular notification
    try {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        badge: options.badge || '/icons/icon-192x192.png',
        tag: options.tag || 'upp-notification',
      });
      console.log('✅ Fallback notification shown');
      return true;
    } catch (fallbackError) {
      console.error('❌ Fallback notification also failed:', fallbackError);
      return false;
    }
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('⚠️ Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('⚠️ Notification permission denied');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Check if notifications are supported and permitted
 */
export function areNotificationsAvailable(): boolean {
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    Notification.permission === 'granted'
  );
}

/**
 * Register service worker for notifications
 */
export async function registerServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Worker not supported');
    return false;
  }

  try {
    // The main service worker is registered by next-pwa
    // We just need to wait for it to be ready
    const registration = await navigator.serviceWorker.ready;
    console.log('✅ Service Worker ready:', registration);
    return true;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return false;
  }
}

