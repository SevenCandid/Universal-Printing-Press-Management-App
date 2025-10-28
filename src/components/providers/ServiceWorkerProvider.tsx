'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/serviceWorkerNotifications'

export default function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register the custom service worker functionality
      registerServiceWorker()
        .then(() => {
          console.log('✅ Service Worker initialized for notifications')
          
          // Load custom service worker script for additional functionality
          navigator.serviceWorker.ready.then((registration) => {
            // Inject custom notification handling
            fetch('/sw-custom.js')
              .then(response => response.text())
              .then(scriptContent => {
                console.log('✅ Custom service worker functionality loaded')
              })
              .catch(err => {
                console.warn('⚠️ Could not load custom service worker:', err)
              })
          })
        })
        .catch((err) => {
          console.warn('⚠️ Service Worker registration failed:', err)
        })
    }
  }, [])

  return <>{children}</>
}

