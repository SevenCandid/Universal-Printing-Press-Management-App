// 🔔 PUSH NOTIFICATION SYSTEM
// This module handles push notifications using FCM or OneSignal

import { supabase } from './supabaseClient'

export type PushPayload = {
  title: string
  body: string
  url?: string
  icon?: string
  badge?: string
}

// =============================================================================
// DEVICE TOKEN MANAGEMENT
// =============================================================================

/**
 * Register a device token for push notifications
 */
export async function registerDeviceToken(
  userId: string,
  token: string,
  deviceType: 'web' | 'ios' | 'android',
  platform?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_devices')
      .upsert({
        user_id: userId,
        device_token: token,
        device_type: deviceType,
        platform: platform || navigator.userAgent,
        last_used: new Date().toISOString()
      }, {
        onConflict: 'device_token'
      })
    
    if (error) throw error
    
    console.log('✅ Device token registered')
    return true
  } catch (error) {
    console.error('❌ Failed to register device token:', error)
    return false
  }
}

/**
 * Remove a device token (on logout)
 */
export async function removeDeviceToken(token: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_devices')
      .delete()
      .eq('device_token', token)
    
    if (error) throw error
    
    console.log('✅ Device token removed')
    return true
  } catch (error) {
    console.error('❌ Failed to remove device token:', error)
    return false
  }
}

/**
 * Get all device tokens for specific roles
 */
export async function getDeviceTokensByRoles(roles: string[]): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_devices')
      .select(`
        device_token,
        profiles:user_id (
          role
        )
      `)
    
    if (error) throw error
    
    const tokens = data
      ?.filter((d: any) => roles.includes(d.profiles?.role))
      .map((d: any) => d.device_token) || []
    
    return tokens
  } catch (error) {
    console.error('❌ Failed to get device tokens:', error)
    return []
  }
}

// =============================================================================
// FIREBASE CLOUD MESSAGING (FCM)
// =============================================================================

/**
 * Send push notification using Firebase Cloud Messaging
 * This should be called from a server/Edge Function with FCM server key
 */
export async function sendPushFCM(
  tokens: string[],
  payload: PushPayload
): Promise<{ success: number; failure: number }> {
  const fcmServerKey = process.env.FCM_SERVER_KEY
  
  if (!fcmServerKey) {
    console.error('❌ FCM_SERVER_KEY not configured')
    return { success: 0, failure: tokens.length }
  }
  
  if (tokens.length === 0) {
    console.warn('⚠️ No tokens to send to')
    return { success: 0, failure: 0 }
  }
  
  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${fcmServerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registration_ids: tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icon-192x192.png',
          badge: payload.badge || '/icon-72x72.png',
          click_action: payload.url || '/',
        },
        data: {
          url: payload.url || '/',
        },
      }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('❌ FCM send failed:', error)
      return { success: 0, failure: tokens.length }
    }
    
    const result = await response.json()
    console.log('✅ FCM sent:', result)
    
    return {
      success: result.success || 0,
      failure: result.failure || 0
    }
  } catch (error) {
    console.error('❌ FCM send error:', error)
    return { success: 0, failure: tokens.length }
  }
}

// =============================================================================
// ONESIGNAL
// =============================================================================

/**
 * Send push notification using OneSignal
 * This can be called from client or server
 */
export async function sendPushOneSignal(
  playerIds: string[],
  payload: PushPayload
): Promise<boolean> {
  const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  const oneSignalApiKey = process.env.ONESIGNAL_API_KEY
  
  if (!oneSignalAppId || !oneSignalApiKey) {
    console.error('❌ OneSignal credentials not configured')
    return false
  }
  
  if (playerIds.length === 0) {
    console.warn('⚠️ No player IDs to send to')
    return false
  }
  
  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${oneSignalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: oneSignalAppId,
        include_player_ids: playerIds,
        headings: { en: payload.title },
        contents: { en: payload.body },
        url: payload.url,
        chrome_web_icon: payload.icon,
        chrome_web_badge: payload.badge,
      }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('❌ OneSignal send failed:', error)
      return false
    }
    
    const result = await response.json()
    console.log('✅ OneSignal sent:', result)
    return true
  } catch (error) {
    console.error('❌ OneSignal send error:', error)
    return false
  }
}

/**
 * Send push to all users with specific roles
 */
export async function sendPushToRoles(
  roles: string[],
  payload: PushPayload
): Promise<boolean> {
  const tokens = await getDeviceTokensByRoles(roles)
  
  if (tokens.length === 0) {
    console.warn('⚠️ No devices found for roles:', roles)
    return false
  }
  
  // Try FCM first, fallback to OneSignal
  const provider = process.env.PUSH_PROVIDER || 'fcm'
  
  if (provider === 'fcm') {
    const result = await sendPushFCM(tokens, payload)
    return result.success > 0
  } else if (provider === 'onesignal') {
    return await sendPushOneSignal(tokens, payload)
  }
  
  console.error('❌ Unknown push provider:', provider)
  return false
}

/**
 * Send large expense push notification
 */
export async function sendLargeExpensePush(expense: {
  title: string
  amount: number
  category: string
  added_by_name?: string
}) {
  const threshold = Number(process.env.EXPENSE_ALERT_THRESHOLD || 1000)
  
  if (expense.amount < threshold) {
    return false // Below threshold
  }
  
  const payload: PushPayload = {
    title: '🚨 Large Expense Alert',
    body: `₵${expense.amount.toLocaleString()}: ${expense.title} (${expense.category})`,
    url: '/expenses',
    icon: '/icon-192x192.png'
  }
  
  // Send to CEO, Manager, and Executive Assistant roles
  return await sendPushToRoles(['ceo', 'manager', 'executive_assistant'], payload)
}

// =============================================================================
// WEB PUSH (Service Worker)
// =============================================================================

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('⚠️ This browser does not support notifications')
    return false
  }
  
  if (Notification.permission === 'granted') {
    return true
  }
  
  if (Notification.permission === 'denied') {
    console.warn('⚠️ Notification permission denied')
    return false
  }
  
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

/**
 * Show a local notification (fallback for when push fails)
 */
export function showLocalNotification(payload: PushPayload) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return
  }
  
  const notification = new Notification(payload.title, {
    body: payload.body,
    icon: payload.icon || '/icon-192x192.png',
    badge: payload.badge || '/icon-72x72.png',
    tag: 'upp-notification',
    requireInteraction: false,
  })
  
  if (payload.url) {
    notification.onclick = () => {
      window.focus()
      window.location.href = payload.url!
      notification.close()
    }
  }
}

