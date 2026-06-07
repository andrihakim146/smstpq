import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-server'
import { santriAdminSelect } from '@/lib/santri-fields'
import { santriPatchSchema, santriProfileData } from '@/lib/santri-schema'

// PATCH /api/admin/santri/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = requireAdmin(request)
  if (check) return check

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }

  const parsed = santriPatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 })

  const exists = await prisma.santri.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'Santri tidak ditemukan.' }, { status: 404 })

  const d = parsed.data

  let status = d.status
  if (d.isActive === true)  status = 'AKTIF'
  if (d.isActive === false && !d.status) status = 'KELUAR'

  const isActive = status ? status === 'AKTIF' : d.isActive

  const santri = await prisma.santri.update({
    where: { id },
    data: {
      ...santriProfileData(d),
      ...(status !== undefined ? {
        status,
        isActive: status === 'AKTIF',
        ...(status !== 'AKTIF' ? { kelasId: null } : {}),
      } : {}),
      ...(d.isActive !== undefined && d.status === undefined ? { isActive: d.isActive } : {}),
      ...(d.statusSejak !== undefined ? {
        statusSejak: d.statusSejak ? new Date(d.statusSejak) : null,
      } : {}),
      ...(d.statusCatatan !== undefined ? { statusCatatan: d.statusCatatan } : {}),
      ...(isActive !== undefined && status === undefined ? { isActive } : {}),
    },
    select: santriAdminSelect,
  })

  return NextResponse.json(santri)
}

// DELETE /api/admin/santri/[id] — hanya santri non-aktif
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = requireAdmin(request)
  if (check) return check

  const { id } = await params

  const santri = await prisma.santri.findUnique({
    where: { id },
    select: { id: true, nama: true, nis: true, status: true, isActive: true },
  })
  if (!santri) return NextResponse.json({ error: 'Santri tidak ditemukan.' }, { status: 404 })

  if (santri.status === 'AKTIF' && santri.isActive) {
    return NextResponse.json(
      { error: 'Santri masih aktif. Ubah status ke Lulus, Pindah, atau Keluar terlebih dahulu.' },
      { status: 422 },
    )
  }

  await prisma.$transaction([
    prisma.absensi.deleteMany({ where: { santriId: id } }),
    prisma.catatan.deleteMany({ where: { santriId: id } }),
    prisma.setoran.deleteMany({ where: { santriId: id } }),
    prisma.santri.delete({ where: { id } }),
  ])

  return NextResponse.json({ success: true, nama: santri.nama, nis: santri.nis })
}
