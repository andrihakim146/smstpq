import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-server'
import { santriAdminSelect } from '@/lib/santri-fields'
import { santriBodySchema, santriProfileData } from '@/lib/santri-schema'

/** Generate NIS format YYYYxxxx — cari NIS terakhir tahun ini, increment. */
async function generateNIS(): Promise<string> {
  const year    = new Date().getFullYear()
  const prefix  = String(year)
  const lastNIS = await prisma.santri.findFirst({
    where:   { nis: { startsWith: prefix } },
    orderBy: { nis: 'desc' },
    select:  { nis: true },
  })

  let seq = 1
  if (lastNIS) {
    const num = parseInt(lastNIS.nis.slice(4), 10)
    if (!isNaN(num)) seq = num + 1
  }
  return `${prefix}${String(seq).padStart(4, '0')}`
}

// GET /api/admin/santri?q=&kelasId=&status=
export async function GET(request: NextRequest) {
  const check = requireAdmin(request)
  if (check) return check

  const sp       = request.nextUrl.searchParams
  const q        = sp.get('q')?.trim() ?? ''
  const kelasId  = sp.get('kelasId') ?? undefined
  const status   = sp.get('status')
  const page     = Math.max(1, Number(sp.get('page') ?? '1'))
  const pageSize = 20

  const where = {
    ...(q.length > 0 ? {
      OR: [
        { nama: { contains: q, mode: 'insensitive' as const } },
        { nis:  { contains: q } },
        { namaWali: { contains: q, mode: 'insensitive' as const } },
      ],
    } : {}),
    ...(kelasId ? { kelasId } : {}),
    ...(status === 'aktif'    ? { status: 'AKTIF' as const } :
        status === 'lulus'   ? { status: 'LULUS' as const } :
        status === 'pindah'  ? { status: 'PINDAH' as const } :
        status === 'keluar'  ? { status: 'KELUAR' as const } :
        status === 'nonaktif' ? { status: { not: 'AKTIF' as const } } : {}),
  }

  const [total, santri] = await Promise.all([
    prisma.santri.count({ where }),
    prisma.santri.findMany({
      where,
      orderBy: [{ status: 'asc' }, { nama: 'asc' }],
      skip:  (page - 1) * pageSize,
      take:  pageSize,
      select: santriAdminSelect,
    }),
  ])

  return NextResponse.json({ total, page, pageSize, data: santri })
}

// POST /api/admin/santri
export async function POST(request: NextRequest) {
  const check = requireAdmin(request)
  if (check) return check

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }

  const parsed = santriBodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 })

  const nis = await generateNIS()
  const d   = parsed.data

  const santri = await prisma.santri.create({
    data: {
      nis,
      nama:               d.nama,
      kelasId:            d.kelasId ?? null,
      jenisKelamin:       d.jenisKelamin ?? null,
      usia:               d.usia ?? null,
      namaWali:           d.namaWali ?? null,
      alamat:             d.alamat ?? null,
      targetPembelajaran: d.targetPembelajaran ?? null,
      deadlineTarget:     d.deadlineTarget ? new Date(d.deadlineTarget) : null,
      noWaWali:           d.noWaWali ?? null,
      status:             'AKTIF',
      isActive:           true,
    },
    select: santriAdminSelect,
  })

  return NextResponse.json(santri, { status: 201 })
}
