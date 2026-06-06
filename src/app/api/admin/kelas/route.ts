import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-server'

const kelasSchema = z.object({ nama: z.string().min(1).max(100).trim() })

// GET /api/admin/kelas
export async function GET(request: NextRequest) {
  const check = requireAdmin(request)
  if (check) return check

  const kelas = await prisma.kelas.findMany({
    orderBy: { nama: 'asc' },
    select: {
      id:   true,
      nama: true,
      _count: { select: { santri: { where: { isActive: true } } } },
    },
  })
  return NextResponse.json(kelas)
}

// POST /api/admin/kelas
export async function POST(request: NextRequest) {
  const check = requireAdmin(request)
  if (check) return check

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }

  const parsed = kelasSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 })

  const exists = await prisma.kelas.findFirst({ where: { nama: { equals: parsed.data.nama, mode: 'insensitive' } } })
  if (exists) return NextResponse.json({ error: 'Nama kelas sudah ada.' }, { status: 409 })

  const kelas = await prisma.kelas.create({
    data: { nama: parsed.data.nama },
    select: { id: true, nama: true, _count: { select: { santri: true } } },
  })
  return NextResponse.json(kelas, { status: 201 })
}
