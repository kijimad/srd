'use client'

const CACHE_NAME = 'theater-pdfs'
const META_DB = 'theater-meta'
const META_STORE = 'pdfs'

// --- Cache API: store/retrieve full PDF blobs ---

export async function cachePdf(pdfPath, blob) {
  if (typeof caches === 'undefined') return
  const cache = await caches.open(CACHE_NAME)
  const response = new Response(blob, {
    headers: { 'Content-Type': 'application/pdf' },
  })
  await cache.put(cacheKey(pdfPath), response)
  try {
    await saveMeta(pdfPath, { name: pdfPath.split('/').pop(), size: blob.size, cachedAt: Date.now() })
  } catch { /* metadata is best-effort */ }
}

export async function getCachedPdf(pdfPath) {
  if (typeof caches === 'undefined') return null
  const cache = await caches.open(CACHE_NAME)
  const response = await cache.match(cacheKey(pdfPath))
  if (!response) return null
  return response.blob()
}

export async function isCached(pdfPath) {
  if (typeof caches === 'undefined') return false
  const cache = await caches.open(CACHE_NAME)
  const response = await cache.match(cacheKey(pdfPath))
  return !!response
}

export async function removeCachedPdf(pdfPath) {
  if (typeof caches === 'undefined') return
  const cache = await caches.open(CACHE_NAME)
  await cache.delete(cacheKey(pdfPath))
  try { await deleteMeta(pdfPath) } catch { /* best-effort */ }
}

function cacheKey(pdfPath) {
  return new Request('/_pdf_cache/' + pdfPath)
}

// --- IndexedDB: metadata for cached PDFs ---

function openMetaDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('No IndexedDB'))
    const req = indexedDB.open(META_DB, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'path' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveMeta(pdfPath, meta) {
  const db = await openMetaDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite')
    tx.objectStore(META_STORE).put({ path: pdfPath, ...meta })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function deleteMeta(pdfPath) {
  const db = await openMetaDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite')
    tx.objectStore(META_STORE).delete(pdfPath)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function listCachedPdfs() {
  if (typeof indexedDB === 'undefined') return []
  const db = await openMetaDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly')
    const req = tx.objectStore(META_STORE).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
