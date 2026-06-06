'use client'

import { useEffect } from 'react'

/**
 * Komponen tanpa UI — dipasang di root layout.
 * Mendaftarkan service worker (public/sw.js) saat halaman dimuat.
 * Hanya berjalan di browser yang mendukung Service Worker.
 */
export default function RegisterPWA() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator))  return
    // Jangan register di dev agar hot-reload tidak terganggu
    if (process.env.NODE_ENV === 'development') return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[SW] registered, scope:', reg.scope)

        // Cek update SW secara berkala
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // SW baru sudah siap — beri tahu user (optional: tampilkan toast)
              console.log('[SW] new version available')
            }
          })
        })
      })
      .catch((err) => console.warn('[SW] registration failed:', err))
  }, [])

  return null
}
