// Badge API utilities for app icon badge count

/**
 * Set the app badge count (shows number on app icon)
 */
export async function setAppBadge(count: number): Promise<boolean> {
  try {
    // Check if Badge API is supported
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
        console.log(`✅ App badge set to ${count}`);
      } else {
        await (navigator as any).clearAppBadge();
        console.log('✅ App badge cleared');
      }
      
      // Also update via service worker (for better mobile support)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_BADGE',
          count: count,
        });
      }
      
      return true;
    } else {
      console.warn('⚠️ Badge API not supported in this browser');
      return false;
    }
  } catch (error) {
    console.error('❌ Error setting app badge:', error);
    return false;
  }
}

/**
 * Clear the app badge
 */
export async function clearAppBadge(): Promise<boolean> {
  return setAppBadge(0);
}

/**
 * Increment the app badge count
 */
export async function incrementBadge(): Promise<boolean> {
  try {
    if ('setAppBadge' in navigator) {
      // Get current count (we'll track this in localStorage)
      const currentCount = parseInt(localStorage.getItem('badge_count') || '0', 10);
      const newCount = currentCount + 1;
      localStorage.setItem('badge_count', newCount.toString());
      return setAppBadge(newCount);
    }
    return false;
  } catch (error) {
    console.error('❌ Error incrementing badge:', error);
    return false;
  }
}

/**
 * Decrement the app badge count
 */
export async function decrementBadge(): Promise<boolean> {
  try {
    if ('setAppBadge' in navigator) {
      const currentCount = parseInt(localStorage.getItem('badge_count') || '0', 10);
      const newCount = Math.max(0, currentCount - 1);
      localStorage.setItem('badge_count', newCount.toString());
      return setAppBadge(newCount);
    }
    return false;
  } catch (error) {
    console.error('❌ Error decrementing badge:', error);
    return false;
  }
}

/**
 * Check if Badge API is supported
 */
export function isBadgeSupported(): boolean {
  return 'setAppBadge' in navigator;
}

