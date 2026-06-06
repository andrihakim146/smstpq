import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-server'
import { buildCsv, csvResponse, fmtDateOnly } from '@/lib/csv-utils'

const BATCH_SIZE = 500

/**
 * POST /api/admin/retensi/execute
 * Body: { before: "YYYY-MM-DD", action: "download_delete" | "delete_only" }
 *
 * download_delete: fetch data → generate CSV → delete in batches → return CSV file
 * delete_only:     delete in batches → return JSON { deleted }
 */
export async function POST(request: NextRequest) {
  const check = requireAdmin(request)
  if (check) return check

  let body: { before?: string; action?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }

  const { before, action } = body
  if (!before || !/^\d{4}-\d{2}-\d{2}$/.test(before)) {
    return NextResponse.json({ error: 'Parameter before (YYYY-MM-DD) wajib diisi.' }, { status: 400 })
  }
  if (action !== 'download_delete' && action !== 'delete_only') {
    return NextResponse.json({ error: 'action harus "download_delete" atau "delete_only".' }, { status: 400 })
  }

  const cutoff = new Date(before)

  // ── 1. Fetch data untuk CSV (hanya jika download_delete) ─────────────────
  let csvContent = ''
  if (action === 'download_delete') {
    const data = await prisma.absensi.findMany({
      where:   { tanggal: { lt: cutoff } },
      orderBy: [{ tanggal: 'asc' }, { santri: { nama: 'asc' } }],
      select: {
        tanggal:    true,
        status:     true,
        keterangan: true,
        santri: {
          select: {
            nis:  true,
            nama: true,
            kelas: { select: { nama: true } },
          },
        },
      },
    })

    const headers = ['Tanggal', 'NIS', 'Nama Santri', 'Kelas', 'Status', 'Keterangan']
    const rows    = data.map((a) => [
      fmtDateOnly(a.tanggal),
      a.santri.nis,
      a.santri.nama,
      a.santri.kelas?.nama ?? '',
      a.status,
      a.keterangan ?? '',
    ])
    csvContent = buildCsv(headers, rows)
  }

  // ── 2. Hapus dalam batch ──────────────────────────────────────────────────
  let deleted = 0
  while (true) {
    // Ambil ID batch yang akan dihapus
    const batch = await prisma.absensi.findMany({
      where:  { tanggal: { lt: cutoff } },
      select: { id: true },
      take:   BATCH_SIZE,
    })
    if (batch.length === 0) break

    const { count } = await prisma.absensi.deleteMany({
      where: { id: { in: batch.map((b) => b.id) } },
    })
    deleted += count

    if (batch.length < BATCH_SIZE) break // last batch
  }

  // ── 3. Return ─────────────────────────────────────────────────────────────
  if (action === 'download_delete') {
    const filename = `smstpq_absensi_arsip_${before}.csv`
    return csvResponse(csvContent, filename)
  }

  return NextResponse.json({ deleted, before })
}
