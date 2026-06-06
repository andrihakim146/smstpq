import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-server'

const santriSchema = z.object({
  nama:               z.string().min(1).max(200).trim(),
  kelasId:            z.string().uuid().optional().nullable(),
  targetPembelajaran: z.string().max(500).optional().nullable(),
  deadlineTarget:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  noWaWali:           z.string().max(20).optional().nullable(),
})

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
  const status   = sp.get('status')  // 'aktif' | 'nonaktif' | undefined
  const page     = Math.max(1, Number(sp.get('page') ?? '1'))
  const pageSize = 20

  const where = {
    ...(q.length > 0 ? {
      OR: [
        { nama: { contains: q, mode: 'insensitive' as const } },
        { nis:  { contains: q } },
      ],
    } : {}),
    ...(kelasId ? { kelasId } : {}),
    ...(status === 'aktif'    ? { isActive: true  } :
        status === 'nonaktif' ? { isActive: false } : {}),
  }

  const [total, santri] = await Promise.all([
    prisma.santri.count({ where }),
    prisma.santri.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { nama: 'asc' }],
      skip:  (page - 1) * pageSize,
      take:  pageSize,
      select: {
        id:                 true,
        nis:                true,
        nama:               true,
        isActive:           true,
        targetPembelajaran: true,
        deadlineTarget:     true,
        noWaWali:           true,
        createdAt:          true,
        kelas:              { select: { id: true, nama: true } },
        _count:             { select: { setoran: true } },
      },
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

  const parsed = santriSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 })

  const nis = await generateNIS()

  const santri = await prisma.santri.create({
    data: {
      nis,
      nama:               parsed.data.nama,
      kelasId:            parsed.data.kelasId ?? null,
      targetPembelajaran: parsed.data.targetPembelajaran ?? null,
      deadlineTarget:     parsed.data.deadlineTarget ? new Date(parsed.data.deadlineTarget) : null,
      noWaWali:           parsed.data.noWaWali ?? null,
    },
    select: {
      id:       true,
      nis:      true,
      nama:     true,
      isActive: true,
      kelas:    { select: { id: true, nama: true } },
    },
  })

  return NextResponse.json(santri, { status: 201 })
}
