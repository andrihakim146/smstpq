import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getSessionFromHeaders } from '@/lib/auth-server'
import { findPengajarWithPin, PIN_TAKEN_MESSAGE } from '@/lib/pin-uniqueness'

// ── GET /api/admin/pengajar ───────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const authResult = requireAdmin(request)
  if (authResult) return authResult

  const pengajarList = await prisma.pengajar.findMany({
    select: {
      id:        true,
      nama:      true,
      peran:     true,
      noWa:      true,
      isActive:  true,
      createdAt: true,
      _count: {
        select: { setoran: true, catatan: true },
      },
    },
    orderBy: [{ peran: 'asc' }, { nama: 'asc' }],
  })

  return NextResponse.json(pengajarList)
}

// ── POST /api/admin/pengajar ──────────────────────────────────────────────────
const createSchema = z.object({
  nama:  z.string().min(2, 'Nama minimal 2 karakter.').max(100),
  pin:   z.string().min(4, 'PIN minimal 4 digit.').max(6).regex(/^\d+$/, 'PIN harus angka.'),
  peran: z.enum(['ADMIN', 'PENGAJAR']),
  noWa:  z.preprocess(
    (v) => (v === '' ? null : v),
    z.string().max(20).nullable().optional(),
  ),
})

export async function POST(request: NextRequest) {
  const authResult = requireAdmin(request)
  if (authResult) return authResult
  const session = getSessionFromHeaders(request)!

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues ?? (parsed.error as unknown as { errors: { message: string }[] }).errors
    return NextResponse.json(
      { error: issues[0]?.message ?? 'Data tidak valid.' },
      { status: 422 },
    )
  }

  const { nama, pin, peran, noWa } = parsed.data

  if (await findPengajarWithPin(pin)) {
    return NextResponse.json({ error: PIN_TAKEN_MESSAGE }, { status: 409 })
  }

  const pinHash = await bcrypt.hash(pin, 10)

  const pengajar = await prisma.pengajar.create({
    data:   { nama, pinHash, peran, noWa: noWa ?? null, isActive: true },
    select: { id: true, nama: true, peran: true, noWa: true, isActive: true, createdAt: true },
  })

  await prisma.logAktivitas.create({
    data: {
      aksi:       'TAMBAH_PENGAJAR',
      detail:     `Admin ${session.nama} menambahkan pengajar baru: ${nama} (${peran})`,
      ip:         request.headers.get('x-forwarded-for') ?? 'unknown',
      pengajarId: session.id,
    },
  })

  return NextResponse.json(pengajar, { status: 201 })
}
