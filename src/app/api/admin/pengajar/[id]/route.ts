import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getSessionFromHeaders } from '@/lib/auth-server'

// ── PATCH /api/admin/pengajar/[id] ───────────────────────────────────────────
// Mendukung dua aksi: toggle isActive DAN reset PIN
const patchSchema = z.discriminatedUnion('aksi', [
  z.object({
    aksi:     z.literal('toggle-aktif'),
    isActive: z.boolean(),
  }),
  z.object({
    aksi: z.literal('reset-pin'),
    pin:  z.string().min(4).max(6).regex(/^\d+$/, 'PIN harus angka.'),
  }),
])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requireAdmin(request)
  if (authResult) return authResult
  const session = getSessionFromHeaders(request)!

  const { id } = await params

  const target = await prisma.pengajar.findUnique({
    where:  { id },
    select: { id: true, nama: true, peran: true },
  })
  if (!target) {
    return NextResponse.json({ error: 'Pengajar tidak ditemukan.' }, { status: 404 })
  }

  // Admin tidak boleh menonaktifkan diri sendiri
  if (target.id === session.id) {
    return NextResponse.json(
      { error: 'Anda tidak dapat mengubah status akun sendiri.' },
      { status: 403 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues ?? (parsed.error as unknown as { errors: { message: string }[] }).errors
    return NextResponse.json(
      { error: issues[0]?.message ?? 'Data tidak valid.' },
      { status: 422 },
    )
  }

  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'

  // ── Toggle aktif/nonaktif ─────────────────────────────────────────────────
  if (parsed.data.aksi === 'toggle-aktif') {
    const { isActive } = parsed.data

    const updated = await prisma.pengajar.update({
      where:  { id },
      data:   { isActive },
      select: { id: true, nama: true, peran: true, isActive: true, createdAt: true },
    })

    await prisma.logAktivitas.create({
      data: {
        aksi:       isActive ? 'AKTIFKAN_PENGAJAR' : 'NONAKTIFKAN_PENGAJAR',
        detail:     `Admin ${session.nama} ${isActive ? 'mengaktifkan' : 'menonaktifkan'} pengajar: ${target.nama}`,
        ip,
        pengajarId: session.id,
      },
    })

    return NextResponse.json(updated)
  }

  // ── Reset PIN ─────────────────────────────────────────────────────────────
  if (parsed.data.aksi === 'reset-pin') {
    const pinHash = await bcrypt.hash(parsed.data.pin, 10)

    const updated = await prisma.pengajar.update({
      where:  { id },
      data:   { pinHash },
      select: { id: true, nama: true, peran: true, isActive: true, createdAt: true },
    })

    await prisma.logAktivitas.create({
      data: {
        aksi:       'RESET_PIN',
        detail:     `Admin ${session.nama} mereset PIN pengajar: ${target.nama}`,
        ip,
        pengajarId: session.id,
      },
    })

    return NextResponse.json(updated)
  }
}
