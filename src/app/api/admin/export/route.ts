import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-server'
import { buildCsv, csvResponse, fmtDateOnly, fmtDatetime } from '@/lib/csv-utils'

// ── Helpers ────────────────────────────────────────────────────────────────────
function xlsxResponse(buffer: ExcelJS.Buffer, filename: string): Response {
  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

async function buildXlsx(
  sheetName: string,
  headers:   string[],
  rows:      unknown[][],
): Promise<ExcelJS.Buffer> {
  const wb    = new ExcelJS.Workbook()
  const sheet = wb.addWorksheet(sheetName)

  sheet.addRow(headers)
  // Style header row
  sheet.getRow(1).font    = { bold: true }
  sheet.getRow(1).fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }

  rows.forEach((r) => sheet.addRow(r as ExcelJS.CellValue[]))

  // Auto-fit kolom (perkiraan lebar)
  sheet.columns.forEach((col) => {
    let maxLen = 10
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0
      if (len > maxLen) maxLen = len
    })
    col.width = Math.min(maxLen + 2, 50)
  })

  return wb.xlsx.writeBuffer()
}

// ── Fetchers per tipe data ─────────────────────────────────────────────────────
async function fetchSantri(sp: URLSearchParams) {
  const kelasId = sp.get('kelasId') ?? undefined
  const status  = sp.get('status')

  const data = await prisma.santri.findMany({
    where: {
      ...(kelasId ? { kelasId } : {}),
      ...(status === 'aktif'    ? { isActive: true  } :
          status === 'nonaktif' ? { isActive: false } : {}),
    },
    orderBy: [{ kelas: { nama: 'asc' } }, { nama: 'asc' }],
    select: {
      nis: true, nama: true, isActive: true,
      targetPembelajaran: true, deadlineTarget: true,
      noWaWali: true, createdAt: true,
      kelas: { select: { nama: true } },
    },
  })

  const headers = ['NIS', 'Nama', 'Kelas', 'Target Pembelajaran', 'Deadline', 'No WA Wali', 'Status', 'Bergabung']
  const rows    = data.map((s) => [
    s.nis, s.nama, s.kelas?.nama ?? '', s.targetPembelajaran ?? '',
    fmtDateOnly(s.deadlineTarget), s.noWaWali ?? '',
    s.isActive ? 'Aktif' : 'Nonaktif', fmtDatetime(s.createdAt),
  ])
  return { headers, rows, name: 'Santri' }
}

async function fetchSetoran(sp: URLSearchParams) {
  const kelasId   = sp.get('kelasId')   ?? undefined
  const tipe      = sp.get('tipe')      ?? undefined
  const startDate = sp.get('startDate') ?? undefined
  const endDate   = sp.get('endDate')   ?? undefined

  const data = await prisma.setoran.findMany({
    where: {
      ...(tipe ? { tipe: tipe as 'AL_QURAN' | 'PRA_TAHSIN' } : {}),
      ...(kelasId ? { santri: { kelasId } } : {}),
      ...(startDate || endDate ? {
        tanggal: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate   ? { lte: new Date(endDate + 'T23:59:59Z') } : {}),
        },
      } : {}),
    },
    orderBy: { tanggal: 'desc' },
    select: {
      tanggal: true, tipe: true,
      surah: true, ayatMulai: true, ayatSelesai: true, kategori: true,
      halamanMulai: true, halamanSelesai: true, nilai: true,
      santri:   { select: { nis: true, nama: true, kelas: { select: { nama: true } } } },
      pengajar: { select: { nama: true } },
      kitab:    { select: { nama: true } },
    },
  })

  const headers = ['Tanggal', 'NIS Santri', 'Nama Santri', 'Kelas', 'Tipe', 'Surah', 'Ayat Mulai', 'Ayat Selesai', 'Kategori', 'Kitab', 'Hal. Mulai', 'Hal. Selesai', 'Nilai', 'Pengajar']
  const rows    = data.map((s) => [
    fmtDateOnly(s.tanggal), s.santri.nis, s.santri.nama, s.santri.kelas?.nama ?? '',
    s.tipe, s.surah ?? '', s.ayatMulai ?? '', s.ayatSelesai ?? '',
    s.kategori ?? '', s.kitab?.nama ?? '', s.halamanMulai ?? '', s.halamanSelesai ?? '',
    s.nilai ?? '', s.pengajar.nama,
  ])
  return { headers, rows, name: 'Setoran' }
}

async function fetchAbsensi(sp: URLSearchParams) {
  const kelasId   = sp.get('kelasId')   ?? undefined
  const startDate = sp.get('startDate') ?? undefined
  const endDate   = sp.get('endDate')   ?? undefined

  const data = await prisma.absensi.findMany({
    where: {
      ...(kelasId ? { santri: { kelasId } } : {}),
      ...(startDate || endDate ? {
        tanggal: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate   ? { lte: new Date(endDate + 'T23:59:59Z') } : {}),
        },
      } : {}),
    },
    orderBy: [{ tanggal: 'desc' }, { santri: { nama: 'asc' } }],
    select: {
      tanggal: true, status: true, keterangan: true,
      santri: { select: { nis: true, nama: true, kelas: { select: { nama: true } } } },
    },
  })

  const headers = ['Tanggal', 'NIS', 'Nama Santri', 'Kelas', 'Status', 'Keterangan']
  const rows    = data.map((a) => [
    fmtDateOnly(a.tanggal), a.santri.nis, a.santri.nama,
    a.santri.kelas?.nama ?? '', a.status, a.keterangan ?? '',
  ])
  return { headers, rows, name: 'Absensi' }
}

async function fetchCatatan(sp: URLSearchParams) {
  const kelasId   = sp.get('kelasId')   ?? undefined
  const startDate = sp.get('startDate') ?? undefined
  const endDate   = sp.get('endDate')   ?? undefined

  const data = await prisma.catatan.findMany({
    where: {
      ...(kelasId ? { santri: { kelasId } } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate   ? { lte: new Date(endDate + 'T23:59:59Z') } : {}),
        },
      } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true, isi: true,
      santri:   { select: { nis: true, nama: true, kelas: { select: { nama: true } } } },
      pengajar: { select: { nama: true } },
    },
  })

  const headers = ['Tanggal', 'NIS', 'Nama Santri', 'Kelas', 'Pengajar', 'Catatan']
  const rows    = data.map((c) => [
    fmtDatetime(c.createdAt), c.santri.nis, c.santri.nama,
    c.santri.kelas?.nama ?? '', c.pengajar.nama, c.isi,
  ])
  return { headers, rows, name: 'Catatan' }
}

// ── GET /api/admin/export ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const check = requireAdmin(request)
  if (check) return check

  const sp     = request.nextUrl.searchParams
  const type   = sp.get('type')   ?? 'santri'
  const format = sp.get('format') ?? 'csv'

  let result: { headers: string[]; rows: unknown[][]; name: string }
  try {
    switch (type) {
      case 'setoran': result = await fetchSetoran(sp); break
      case 'absensi': result = await fetchAbsensi(sp); break
      case 'catatan': result = await fetchCatatan(sp); break
      default:        result = await fetchSantri(sp);  break
    }
  } catch {
    return NextResponse.json({ error: 'Gagal mengambil data.' }, { status: 500 })
  }

  const ts       = new Date().toISOString().slice(0, 10)
  const filename = `smstpq_${type}_${ts}`

  if (format === 'xlsx') {
    const buffer = await buildXlsx(result.name, result.headers, result.rows)
    return xlsxResponse(buffer, `${filename}.xlsx`)
  }

  const csv = buildCsv(result.headers, result.rows)
  return csvResponse(csv, `${filename}.csv`)
}
