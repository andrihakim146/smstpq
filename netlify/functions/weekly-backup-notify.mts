/**
 * Netlify Scheduled Function — Pengingat Backup Mingguan
 * Jadwal: setiap Minggu jam 03:00 UTC (10:00 WIB)
 *
 * Mengirimkan push notification ke semua admin yang ter-subscribe,
 * mengingatkan untuk melakukan backup manual via halaman /admin/backup.
 * Juga mencatat log aktivitas.
 */
import type { Config } from '@netlify/functions'

const APP_URL     = process.env.NEXT_PUBLIC_APP_URL ?? ''
const CRON_SECRET = process.env.CRON_SECRET ?? ''

export default async function handler(): Promise<Response> {
  const startedAt = new Date().toISOString()
  console.log(`[weekly-backup-notify] started at ${startedAt}`)

  if (!APP_URL || !CRON_SECRET) {
    console.error('[weekly-backup-notify] Missing APP_URL or CRON_SECRET env vars')
    return new Response('Misconfigured', { status: 500 })
  }

  try {
    const res  = await fetch(`${APP_URL}/api/cron/backup-notify`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'x-cron-secret': CRON_SECRET,
      },
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      console.error(`[weekly-backup-notify] API error ${res.status}:`, data)
      return new Response(JSON.stringify({ ok: false, error: data }), { status: 500 })
    }

    console.log(`[weekly-backup-notify] done:`, data)
    return new Response(JSON.stringify({ ok: true, ...data }), { status: 200 })
  } catch (err) {
    console.error('[weekly-backup-notify] exception:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 })
  }
}

export const config: Config = {
  schedule: '0 3 * * 0',
}
