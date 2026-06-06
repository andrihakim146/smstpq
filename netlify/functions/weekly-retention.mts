/**
 * Netlify Scheduled Function — Retensi Data Absensi Mingguan
 * Jadwal: setiap Minggu jam 02:00 UTC (09:00 WIB)
 *
 * Menghapus record Absensi yang lebih lama dari RETENTION_MONTHS bulan
 * secara bertahap (batch delete) agar tidak timeout.
 */
import type { Config } from '@netlify/functions'

const APP_URL       = process.env.NEXT_PUBLIC_APP_URL ?? ''
const CRON_SECRET   = process.env.CRON_SECRET ?? ''
const RETENTION_MONTHS = parseInt(process.env.RETENTION_MONTHS ?? '6', 10)

export default async function handler(): Promise<Response> {
  const startedAt = new Date().toISOString()
  console.log(`[weekly-retention] started at ${startedAt}`)

  if (!APP_URL || !CRON_SECRET) {
    console.error('[weekly-retention] Missing APP_URL or CRON_SECRET env vars')
    return new Response('Misconfigured', { status: 500 })
  }

  try {
    const before = new Date()
    before.setMonth(before.getMonth() - RETENTION_MONTHS)

    const url    = `${APP_URL}/api/cron/retention`
    const res    = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-cron-secret':   CRON_SECRET,
      },
      body: JSON.stringify({ before: before.toISOString() }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      console.error(`[weekly-retention] API error ${res.status}:`, data)
      return new Response(JSON.stringify({ ok: false, error: data }), { status: 500 })
    }

    console.log(`[weekly-retention] done:`, data)
    return new Response(JSON.stringify({ ok: true, ...data }), { status: 200 })
  } catch (err) {
    console.error('[weekly-retention] exception:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 })
  }
}

export const config: Config = {
  schedule: '0 2 * * 0',
}
