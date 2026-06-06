'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding  = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = atob(base64)
  const buf      = new ArrayBuffer(rawData.length)
  const view     = new Uint8Array(buf)
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i)
  return buf
}

type PermissionState = 'unsupported' | 'default' | 'granted' | 'denied'

interface Props {
  santriNis: string
  /** Callback opsional setelah subscribe/unsubscribe */
  onStatusChange?: (subscribed: boolean) => void
}

export default function PushSubscribeButton({ santriNis, onStatusChange }: Props) {
  const [status,     setStatus]     = useState<PermissionState>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [endpoint,   setEndpoint]   = useState<string | null>(null)

  // Cek dukungan & status saat komponen mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return
    }

    setStatus(Notification.permission as PermissionState)

    // Cek apakah sudah subscribe
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) { setSubscribed(true); setEndpoint(sub.endpoint) }
      })
    })
  }, [])

  async function handleSubscribe() {
    setLoading(true)
    try {
      // Register SW jika belum
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      setStatus(permission as PermissionState)
      if (permission !== 'granted') return

      // Subscribe ke push manager
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const keys = sub.toJSON().keys as { p256dh: string; auth: string }

      // Kirim ke server
      const res = await fetch('/api/notifications/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          santriNis: santriNis,
          endpoint:  sub.endpoint,
          p256dh:    keys.p256dh,
          auth:      keys.auth,
        }),
      })

      if (res.ok) {
        setSubscribed(true)
        setEndpoint(sub.endpoint)
        onStatusChange?.(true)
      } else {
        await sub.unsubscribe()
      }
    } catch (err) {
      console.error('Push subscribe error:', err)
    } finally { setLoading(false) }
  }

  async function handleUnsubscribe() {
    if (!endpoint) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()

      await fetch('/api/notifications/subscribe', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ endpoint }),
      })

      setSubscribed(false)
      setEndpoint(null)
      onStatusChange?.(false)
    } finally { setLoading(false) }
  }

  if (status === 'unsupported') return null

  if (status === 'denied') {
    return (
      <button
        disabled
        title="Notifikasi diblokir oleh browser. Aktifkan melalui pengaturan browser."
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 cursor-not-allowed"
      >
        <BellOff className="w-4 h-4" />
        <span className="hidden sm:inline">Notifikasi diblokir</span>
      </button>
    )
  }

  if (subscribed) {
    return (
      <button
        onClick={handleUnsubscribe}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs font-semibold px-3 py-1.5 transition-colors"
        title="Matikan notifikasi untuk santri ini"
      >
        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Bell className="w-3.5 h-3.5" />
        }
        <span className="hidden sm:inline">Notifikasi Aktif</span>
      </button>
    )
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-semibold px-3 py-1.5 transition-colors"
      title="Aktifkan notifikasi untuk santri ini"
    >
      {loading
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <Bell className="w-3.5 h-3.5" />
      }
      Aktifkan Notifikasi
    </button>
  )
}
