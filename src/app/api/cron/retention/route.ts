/**
 * POST /api/cron/retention
 * Dipanggil oleh Netlify Scheduled Function weekly-retention.
 * Dilindungi dengan CRON_SECRET header.
 *
 * Menghapus record Absensi lebih tua dari `before` secara batch.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BATCH_SIZE  = 500
const CRON_SECRET = process.env.CRON_SECRET

function verifyCronSecret(request: NextRequest): boolean {
  if (!CRON_SECRET) return false
  return request.headers.get('x-cron-secret') === CRON_SECRET
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: { before?: string } = {}
  try { body = await request.json() } catch { /* gunakan default */ }

  const before = body.before ? new Date(body.before) : (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 6)
    return d
  })()

  if (isNaN(before.getTime())) {
    return NextResponse.json({ error: 'Tanggal tidak valid.' }, { status: 422 })
  }

  let totalDeleted = 0

  // Batch delete agar tidak timeout
  while (true) {
    const ids = await prisma.absensi.findMany({
      where:   { tanggal: { lt: before } },
      select:  { id: true },
      take:    BATCH_SIZE,
    })
    if (ids.length === 0) break

    const { count } = await prisma.absensi.deleteMany({
      where: { id: { in: ids.map((r) => r.id) } },
    })
    totalDeleted += count

    if (ids.length < BATCH_SIZE) break
  }

  // Log aktivitas
  await prisma.logAktivitas.create({
    data: {
      aksi:   'RETENSI_OTOMATIS',
      detail: `Cron: hapus ${totalDeleted} record absensi sebelum ${before.toLocaleDateString('id-ID')}`,
      ip:     'cron',
    },
  }).catch(() => {})

  console.log(`[cron/retention] deleted ${totalDeleted} records before ${before.toISOString()}`)

  return NextResponse.json({ ok: true, deleted: totalDeleted, before: before.toISOString() })
}
