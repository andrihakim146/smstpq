import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-server'

const kitabSchema = z.object({ nama: z.string().min(1).max(200).trim() })

// GET /api/admin/kitab
export async function GET(request: NextRequest) {
  const check = requireAdmin(request)
  if (check) return check

  const kitab = await prisma.kitab.findMany({
    orderBy: [{ isActive: 'desc' }, { nama: 'asc' }],
    select: {
      id:        true,
      nama:      true,
      isActive:  true,
      createdAt: true,
      _count:    { select: { setoran: true } },
    },
  })
  return NextResponse.json(kitab)
}

// POST /api/admin/kitab
export async function POST(request: NextRequest) {
  const check = requireAdmin(request)
  if (check) return check

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }

  const parsed = kitabSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 })

  const exists = await prisma.kitab.findFirst({ where: { nama: { equals: parsed.data.nama, mode: 'insensitive' } } })
  if (exists) return NextResponse.json({ error: 'Nama kitab sudah ada.' }, { status: 409 })

  const kitab = await prisma.kitab.create({
    data: { nama: parsed.data.nama },
    select: { id: true, nama: true, isActive: true, _count: { select: { setoran: true } } },
  })
  return NextResponse.json(kitab, { status: 201 })
}
