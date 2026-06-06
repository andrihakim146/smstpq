/**
 * POST /api/cron/backup-notify
 * Dipanggil oleh Netlify Scheduled Function weekly-backup-notify.
 * Dilindungi dengan CRON_SECRET header.
 *
 * Mencatat log backup mingguan dan (opsional) mengirim email/notifikasi
 * ke admin. Saat ini hanya menulis LogAktivitas sebagai pengingat.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CRON_SECRET = process.env.CRON_SECRET

function verifyCronSecret(request: NextRequest): boolean {
  if (!CRON_SECRET) return false
  return request.headers.get('x-cron-secret') === CRON_SECRET
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const now = new Date()

  // Log aktivitas (sistem) sebagai pengingat backup
  await prisma.logAktivitas.create({
    data: {
      aksi:   'BACKUP_REMINDER',
      detail: `Cron: pengingat backup mingguan — ${now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
      ip:     'cron',
    },
  })

  // Statistik ringkas untuk admin (ditampilkan di log)
  const [jumlahSantri, jumlahSetoran, jumlahAbsensi] = await Promise.all([
    prisma.santri.count({ where: { isActive: true } }),
    prisma.setoran.count(),
    prisma.absensi.count(),
  ])

  const summary = {
    santriAktif:   jumlahSantri,
    totalSetoran:  jumlahSetoran,
    totalAbsensi:  jumlahAbsensi,
    at:            now.toISOString(),
  }

  console.log('[cron/backup-notify] weekly summary:', summary)

  return NextResponse.json({ ok: true, ...summary })
}
