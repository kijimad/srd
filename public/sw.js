const SHELL_CACHE = 'theater-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      fetch('/', { cache: 'no-store' }).then((res) => cache.put('/', res))
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone()
          caches.open(SHELL_CACHE).then((c) => c.put('/', clone))
          return res
        })
        .catch(() => caches.match('/'))
    )
    return
  }

  // JS/CSS/images: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(SHELL_CACHE).then((c) => c.put(event.request, clone))
        }
        return res
      })
    })
  )
})
