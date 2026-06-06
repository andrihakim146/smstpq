import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

// ── Konfigurasi VAPID ──────────────────────────────────────────────────────
const PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!
const SUBJECT     = process.env.VAPID_SUBJECT ?? 'mailto:admin@smstpq.app'

if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY)
}

// ── Tipe payload notifikasi ────────────────────────────────────────────────
export interface PushPayload {
  title:     string
  body:      string
  url:       string
  tag?:      string
  santriNis?: string
  icon?:     string
  badge?:    string
}

// ── Kirim ke semua subscription milik santri ───────────────────────────────
export async function sendToSantri(
  santriId: string,
  payload:  PushPayload,
): Promise<{ sent: number; removed: number }> {
  const subs = await prisma.pushSubscription.findMany({
    where: { santriId },
  })

  if (subs.length === 0) return { sent: 0, removed: 0 }

  const data    = JSON.stringify({ ...payload, icon: '/icon-192x192.png', badge: '/badge-72x72.png' })
  let sent      = 0
  let removed   = 0

  await Promise.allSettled(
    subs.map(async (sub: typeof subs[0]) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
          { TTL: 86400 }, // 24 jam
        )
        sent++
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) {
          // Subscription expired / invalid — hapus dari DB
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
          removed++
        }
      }
    }),
  )

  return { sent, removed }
}

/** Buat payload notifikasi setoran baru. */
export function setoranPayload(params: {
  santriNama: string
  santriNis:  string
  tipe:       string
  detail:     string
  nilai?:     string | null
  appUrl:     string
}): PushPayload {
  const tipeLabel = params.tipe === 'AL_QURAN' ? "Al-Qur'an" : 'Pra-Tahsin'
  const nilai     = params.nilai ? ` · ${params.nilai}` : ''
  return {
    title:     `📖 Setoran Baru — ${params.santriNama}`,
    body:      `${tipeLabel}: ${params.detail}${nilai}`,
    url:       `${params.appUrl}/santri/${params.santriNis}`,
    tag:       `setoran-${params.santriNis}`,
    santriNis: params.santriNis,
  }
}

/** Buat payload notifikasi catatan baru. */
export function catatanPayload(params: {
  santriNama: string
  santriNis:  string
  isi:        string
  appUrl:     string
}): PushPayload {
  return {
    title:     `📝 Catatan Baru — ${params.santriNama}`,
    body:      params.isi.length > 100 ? params.isi.slice(0, 97) + '…' : params.isi,
    url:       `${params.appUrl}/santri/${params.santriNis}`,
    tag:       `catatan-${params.santriNis}`,
    santriNis: params.santriNis,
  }
}
