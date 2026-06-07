import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getSessionFromHeaders } from '@/lib/auth-server'
import { encryptBackup, validatePassword } from '@/lib/backup-crypto'
import { logBackupDownload, logApiError } from '@/lib/logger'
import { getIp } from '@/lib/get-ip'

export const maxDuration = 60 // Netlify/Vercel max function duration (seconds)

// ── POST /api/admin/backup/download ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  const ip    = getIp(request)
  const check = requireAdmin(request)
  if (check) return check

  let body: { password?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }

  const pwError = validatePassword(body.password ?? '')
  if (pwError) return NextResponse.json({ error: pwError }, { status: 422 })

  // ── Ambil semua data paralel ───────────────────────────────────────────────
  const [pengajar, kelas, kitab, santri, setoran, catatan, absensi] = await Promise.all([
    prisma.pengajar.findMany({
      select: {
        id: true, nama: true, pinHash: true,
        peran: true, noWa: true, isActive: true, createdAt: true,
      },
    }),
    prisma.kelas.findMany(),
    prisma.kitab.findMany(),
    prisma.santri.findMany(),
    prisma.setoran.findMany(),
    prisma.catatan.findMany(),
    prisma.absensi.findMany(),
  ])

  const payload = {
    createdAt: new Date().toISOString(),
    stats: {
      pengajar: pengajar.length,
      kelas:    kelas.length,
      kitab:    kitab.length,
      santri:   santri.length,
      setoran:  setoran.length,
      catatan:  catatan.length,
      absensi:  absensi.length,
    },
    data: { pengajar, kelas, kitab, santri, setoran, catatan, absensi },
  }

  const json = JSON.stringify(payload)
  const enc  = encryptBackup(json, body.password!)

  // Catat aktivitas
  const session = getSessionFromHeaders(request)
  const sizeEst = `~${Math.round(json.length / 1024)}KB`
  if (session) {
    logBackupDownload({ pengajarId: session.id, ip, sizeEstimate: sizeEst })
    await prisma.logAktivitas.create({
      data: {
        pengajarId: session.id,
        aksi:       'BACKUP_DOWNLOAD',
        detail:     `Backup diunduh: ${pengajar.length} pengajar, ${santri.length} santri, ${setoran.length} setoran, ${absensi.length} absensi (${sizeEst})`,
        ip,
      },
    })
  }

  const date     = new Date().toISOString().slice(0, 10)
  const filename = `backup-smstpq-${date}.json.enc`

  return new Response(enc, {
    headers: {
      'Content-Type':        'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
