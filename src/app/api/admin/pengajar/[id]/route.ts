import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getSessionFromHeaders } from '@/lib/auth-server'
import { findPengajarWithPin, PIN_TAKEN_MESSAGE } from '@/lib/pin-uniqueness'

const patchSchema = z.discriminatedUnion('aksi', [
  z.object({
    aksi:     z.literal('toggle-aktif'),
    isActive: z.boolean(),
  }),
  z.object({
    aksi: z.literal('reset-pin'),
    pin:  z.string().min(4).max(6).regex(/^\d+$/, 'PIN harus angka.'),
  }),
  z.object({
    aksi:  z.literal('update-profil'),
    nama:  z.string().min(2).max(100).optional(),
    noWa:  z.preprocess(
      (v) => (v === '' ? null : v),
      z.string().max(20).nullable().optional(),
    ),
    peran: z.enum(['ADMIN', 'PENGAJAR']).optional(),
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

  if (parsed.data.aksi === 'toggle-aktif') {
    if (target.id === session.id) {
      return NextResponse.json(
        { error: 'Anda tidak dapat mengubah status akun sendiri.' },
        { status: 403 },
      )
    }

    const { isActive } = parsed.data
    const updated = await prisma.pengajar.update({
      where:  { id },
      data:   { isActive },
      select: { id: true, nama: true, peran: true, noWa: true, isActive: true, createdAt: true },
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

  if (parsed.data.aksi === 'reset-pin') {
    const { pin } = parsed.data

    if (await findPengajarWithPin(pin, id)) {
      return NextResponse.json({ error: PIN_TAKEN_MESSAGE }, { status: 409 })
    }

    const pinHash = await bcrypt.hash(pin, 10)
    const updated = await prisma.pengajar.update({
      where:  { id },
      data:   { pinHash },
      select: { id: true, nama: true, peran: true, noWa: true, isActive: true, createdAt: true },
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

  if (parsed.data.aksi === 'update-profil') {
    const { nama, noWa, peran } = parsed.data
    if (peran !== undefined && target.id === session.id && peran !== target.peran) {
      return NextResponse.json(
        { error: 'Anda tidak dapat mengubah peran akun sendiri.' },
        { status: 403 },
      )
    }

    const updated = await prisma.pengajar.update({
      where: { id },
      data: {
        ...(nama  !== undefined ? { nama } : {}),
        ...(noWa  !== undefined ? { noWa } : {}),
        ...(peran !== undefined ? { peran } : {}),
      },
      select: {
        id: true, nama: true, peran: true, noWa: true, isActive: true, createdAt: true,
        _count: { select: { setoran: true, catatan: true } },
      },
    })

    return NextResponse.json(updated)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requireAdmin(request)
  if (authResult) return authResult
  const session = getSessionFromHeaders(request)!

  const { id } = await params

  if (id === session.id) {
    return NextResponse.json(
      { error: 'Anda tidak dapat menghapus akun sendiri.' },
      { status: 403 },
    )
  }

  const target = await prisma.pengajar.findUnique({
    where: { id },
    select: {
      id: true, nama: true, isActive: true,
      _count: { select: { setoran: true, catatan: true } },
    },
  })
  if (!target) {
    return NextResponse.json({ error: 'Pengajar tidak ditemukan.' }, { status: 404 })
  }

  if (target.isActive) {
    return NextResponse.json(
      { error: 'Pengajar masih aktif. Nonaktifkan terlebih dahulu sebelum menghapus.' },
      { status: 422 },
    )
  }

  if (target._count.setoran > 0 || target._count.catatan > 0) {
    return NextResponse.json(
      { error: 'Pengajar masih memiliki riwayat setoran/catatan. Data tidak dapat dihapus.' },
      { status: 409 },
    )
  }

  await prisma.pengajar.delete({ where: { id } })

  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  await prisma.logAktivitas.create({
    data: {
      aksi:       'HAPUS_PENGAJAR',
      detail:     `Admin ${session.nama} menghapus pengajar: ${target.nama}`,
      ip,
      pengajarId: session.id,
    },
  })

  return NextResponse.json({ success: true, nama: target.nama })
}
