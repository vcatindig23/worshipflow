const CACHE_NAME = "worshipflow-offline-v1"
const OFFLINE_FILES = [
  "/offline-stage.html",
  "/offline-stage.js",
  "/worshipflow-app-icon.png",
]
const LIVE_STAGE_PATH = /^\/setlists\/[0-9a-f-]+\/live\/?$/i

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(OFFLINE_FILES))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("worshipflow-offline-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.mode !== "navigate" ||
    !LIVE_STAGE_PATH.test(url.pathname)
  ) {
    return
  }

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME)
      const fallback = await cache.match("/offline-stage.html")
      return fallback ?? Response.error()
    })
  )
})
