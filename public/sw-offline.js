// Enhanced Service Worker for Complete Offline Support
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `upp-cache-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `upp-data-cache-${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `upp-image-cache-${CACHE_VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/assets/logo/UPPLOGO.png',
  '/assets/logo/logo.png',
  '/assets/logo/logo-dark.png',
];

// API routes to cache
const API_ROUTES = [
  '/api/',
  '/rest/v1/',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error('[ServiceWorker] Cache addAll failed:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== DATA_CACHE_NAME && 
              cacheName !== IMAGE_CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/api/')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => {
            // Return cached version if offline
            return cache.match(request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return offline response
              return new Response(
                JSON.stringify({ 
                  error: 'Offline', 
                  message: 'You are offline. Showing cached data.' 
                }),
                { 
                  headers: { 'Content-Type': 'application/json' },
                  status: 503 
                }
              );
            });
          });
      })
    );
    return;
  }

  // Handle image requests
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            if (response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => {
            // Return placeholder for offline images
            return cache.match('/assets/logo/UPPLOGO.png');
          });
        });
      })
    );
    return;
  }

  // Handle all other requests - Network First, fallback to cache
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version and update in background
        fetch(request).then((response) => {
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // If offline and no cache, return offline page
        if (request.mode === 'navigate') {
          return caches.match('/offline');
        }
      });
    })
  );
});

// Background Sync for offline queue
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  try {
    // Open IndexedDB and process queued operations
    const db = await openDB();
    const tx = db.transaction('offlineQueue', 'readonly');
    const store = tx.objectStore('offlineQueue');
    const queue = await store.getAll();

    for (const item of queue) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });
        
        // Remove from queue on success
        const deleteTx = db.transaction('offlineQueue', 'readwrite');
        await deleteTx.objectStore('offlineQueue').delete(item.id);
      } catch (error) {
        console.error('[ServiceWorker] Sync failed for:', item.url);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync queue error:', error);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('UPPOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offlineQueue')) {
        db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('offlineData')) {
        db.createObjectStore('offlineData', { keyPath: 'key' });
      }
    };
  });
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New notification',
    icon: '/assets/logo/UPPLOGO.png',
    badge: '/assets/logo/UPPLOGO.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'UPP Notification', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

console.log('[ServiceWorker] Loaded');

