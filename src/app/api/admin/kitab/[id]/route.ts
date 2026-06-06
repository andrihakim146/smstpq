import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-server'

const patchSchema = z.object({
  nama:     z.string().min(1).max(200).trim().optional(),
  isActive: z.boolean().optional(),
})

// PATCH /api/admin/kitab/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = requireAdmin(request)
  if (check) return check

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 })

  const exists = await prisma.kitab.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'Kitab tidak ditemukan.' }, { status: 404 })

  // Cek duplikasi nama jika berganti nama
  if (parsed.data.nama) {
    const dup = await prisma.kitab.findFirst({
      where: { nama: { equals: parsed.data.nama, mode: 'insensitive' }, NOT: { id } },
    })
    if (dup) return NextResponse.json({ error: 'Nama kitab sudah digunakan.' }, { status: 409 })
  }

  const kitab = await prisma.kitab.update({
    where: { id },
    data: {
      ...(parsed.data.nama     !== undefined ? { nama: parsed.data.nama }         : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
    select: { id: true, nama: true, isActive: true, _count: { select: { setoran: true } } },
  })
  return NextResponse.json(kitab)
}
