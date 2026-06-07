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
  /** compact = icon+label di header; banner = kartu penuh di halaman */
  variant?: 'compact' | 'banner'
  onStatusChange?: (subscribed: boolean) => void
}

export default function PushSubscribeButton({
  santriNis,
  variant = 'compact',
  onStatusChange,
}: Props) {
  const [status,     setStatus]     = useState<PermissionState>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [endpoint,   setEndpoint]   = useState<string | null>(null)
  const [mounted,    setMounted]    = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    setStatus(Notification.permission as PermissionState)

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) { setSubscribed(true); setEndpoint(sub.endpoint) }
      })
    })
  }, [mounted])

  async function handleSubscribe() {
    if (status === 'unsupported') return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      setStatus(permission as PermissionState)
      if (permission !== 'granted') return

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const keys = sub.toJSON().keys as { p256dh: string; auth: string }

      const res = await fetch('/api/notifications/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          santriNis,
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

  if (!mounted) {
    return variant === 'banner' ? (
      <div className="h-14 rounded-2xl bg-slate-100 animate-pulse" />
    ) : (
      <span className="inline-block w-8 h-8 rounded-full bg-slate-100 animate-pulse shrink-0" />
    )
  }

  const compactBtn = 'inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold px-2.5 sm:px-3 py-1.5 transition-colors shrink-0'

  // Browser tidak mendukung push — tetap tampilkan penjelasan (jangan return null)
  if (status === 'unsupported') {
    if (variant === 'banner') {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <Bell className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-800">Notifikasi push</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Di iPhone, tambahkan SMSTPQ ke Layar Utama (Share → Add to Home Screen),
              lalu buka dari ikon aplikasi. Di Android, gunakan Chrome terbaru.
            </p>
          </div>
        </div>
      )
    }
    return (
      <button
        type="button"
        title="Browser ini belum mendukung notifikasi push. Install aplikasi SMSTPQ ke layar utama."
        className={`${compactBtn} bg-amber-50 text-amber-700 border border-amber-200`}
      >
        <Bell className="w-4 h-4 shrink-0" />
        <span className="sr-only sm:not-sr-only sm:inline">Notifikasi</span>
      </button>
    )
  }

  if (status === 'denied') {
    const denied = (
      <>
        <BellOff className="w-4 h-4 shrink-0" />
        <span>Notifikasi diblokir</span>
      </>
    )
    if (variant === 'banner') {
      return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex gap-3 text-sm text-slate-600">
          <BellOff className="w-5 h-5 shrink-0 text-slate-400" />
          <p>Notifikasi diblokir. Aktifkan izin notifikasi untuk situs ini di pengaturan browser Anda.</p>
        </div>
      )
    }
    return (
      <button type="button" disabled className={`${compactBtn} text-slate-400 cursor-not-allowed`}>
        {denied}
      </button>
    )
  }

  if (subscribed) {
    const active = (
      <>
        {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Bell className="w-4 h-4 shrink-0" />}
        <span>Notifikasi aktif</span>
      </>
    )
    if (variant === 'banner') {
      return (
        <button
          type="button"
          onClick={handleUnsubscribe}
          disabled={loading}
          className="w-full flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left hover:bg-emerald-100 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600 shrink-0" /> : <Bell className="w-5 h-5 text-emerald-600 shrink-0" />}
            <div>
              <p className="text-sm font-semibold text-emerald-800">Notifikasi aktif</p>
              <p className="text-xs text-emerald-600">Anda akan menerima update setoran santri</p>
            </div>
          </div>
          <span className="text-xs text-emerald-700 underline shrink-0">Matikan</span>
        </button>
      )
    }
    return (
      <button
        type="button"
        onClick={handleUnsubscribe}
        disabled={loading}
        className={`${compactBtn} bg-emerald-100 text-emerald-700 hover:bg-emerald-200`}
        title="Matikan notifikasi"
      >
        {active}
      </button>
    )
  }

  const subscribe = (
    <>
      {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Bell className="w-4 h-4 shrink-0" />}
      <span>Aktifkan notifikasi</span>
    </>
  )

  if (variant === 'banner') {
    return (
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-left hover:bg-blue-100 transition-colors disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin text-blue-600 shrink-0" /> : <Bell className="w-5 h-5 text-blue-600 shrink-0" />}
        <div>
          <p className="text-sm font-semibold text-blue-800">Aktifkan notifikasi</p>
          <p className="text-xs text-blue-600">Dapatkan pemberitahuan saat ada setoran baru</p>
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleSubscribe}
      disabled={loading}
      className={`${compactBtn} bg-blue-100 text-blue-700 hover:bg-blue-200`}
      title="Aktifkan notifikasi"
    >
      {subscribe}
    </button>
  )
}
