import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function startOfWeek(): Date {
  const now  = new Date()
  const day  = now.getDay()            // 0 = Minggu
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Senin
  const mon  = new Date(now)
  mon.setDate(diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

function thirtyDaysAgo(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET() {
  const [
    totalSantri,
    setoranMingguIni,
    absensiStats,
  ] = await Promise.all([
    // Total santri aktif
    prisma.santri.count({ where: { isActive: true } }),

    // Setoran minggu ini — dikelompokkan per tipe
    prisma.setoran.groupBy({
      by:     ['tipe'],
      where:  { tanggal: { gte: startOfWeek() } },
      _count: { _all: true },
    }),

    // Absensi 30 hari terakhir — hitung hadir vs total
    prisma.absensi.groupBy({
      by:     ['status'],
      where:  { tanggal: { gte: thirtyDaysAgo() } },
      _count: { _all: true },
    }),
  ])

  // Hitung setoran per tipe
  const setoranAlQuran  = setoranMingguIni.find((r) => r.tipe === 'AL_QURAN')?._count._all  ?? 0
  const setoranPraTahsin = setoranMingguIni.find((r) => r.tipe === 'PRA_TAHSIN')?._count._all ?? 0

  // Hitung persentase kehadiran
  const totalAbsensi = absensiStats.reduce((s, r) => s + r._count._all, 0)
  const totalHadir   = absensiStats.find((r) => r.status === 'HADIR')?._count._all ?? 0
  const persenHadir  = totalAbsensi > 0 ? Math.round((totalHadir / totalAbsensi) * 100) : 0

  const body = {
    totalSantri,
    setoranMingguIni: {
      alQuran:   setoranAlQuran,
      praTahsin: setoranPraTahsin,
      total:     setoranAlQuran + setoranPraTahsin,
    },
    kehadiran: {
      persentase: persenHadir,
      hadir:      totalHadir,
      total:      totalAbsensi,
    },
  }

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 's-maxage=60, stale-while-revalidate=30',
    },
  })
}
