import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-server'

const patchSchema = z.object({ nama: z.string().min(1).max(100).trim() })

// PATCH /api/admin/kelas/[id] — rename kelas
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = requireAdmin(request)
  if (check) return check

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 })

  const exists = await prisma.kelas.findFirst({
    where: { nama: { equals: parsed.data.nama, mode: 'insensitive' }, NOT: { id } },
  })
  if (exists) return NextResponse.json({ error: 'Nama kelas sudah digunakan.' }, { status: 409 })

  const kelas = await prisma.kelas.update({
    where: { id },
    data:  { nama: parsed.data.nama },
    select: { id: true, nama: true },
  })
  return NextResponse.json(kelas)
}

// DELETE /api/admin/kelas/[id]
// Pindahkan semua santri ke kelasId = null sebelum hapus.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = requireAdmin(request)
  if (check) return check

  const { id } = await params

  const kelas = await prisma.kelas.findUnique({ where: { id } })
  if (!kelas) return NextResponse.json({ error: 'Kelas tidak ditemukan.' }, { status: 404 })

  // Pindahkan santri ke tanpa kelas
  await prisma.santri.updateMany({ where: { kelasId: id }, data: { kelasId: null } })
  await prisma.kelas.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
