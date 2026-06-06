import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-server'

const patchSchema = z.object({
  nama:               z.string().min(1).max(200).trim().optional(),
  kelasId:            z.string().uuid().nullable().optional(),
  targetPembelajaran: z.string().max(500).nullable().optional(),
  deadlineTarget:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  noWaWali:           z.string().max(20).nullable().optional(),
  isActive:           z.boolean().optional(),
})

// PATCH /api/admin/santri/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = requireAdmin(request)
  if (check) return check

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 })

  const exists = await prisma.santri.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'Santri tidak ditemukan.' }, { status: 404 })

  const d = parsed.data
  const santri = await prisma.santri.update({
    where: { id },
    data: {
      ...(d.nama               !== undefined ? { nama: d.nama }                     : {}),
      ...(d.kelasId            !== undefined ? { kelasId: d.kelasId }               : {}),
      ...(d.targetPembelajaran !== undefined ? { targetPembelajaran: d.targetPembelajaran } : {}),
      ...(d.deadlineTarget     !== undefined ? {
        deadlineTarget: d.deadlineTarget ? new Date(d.deadlineTarget) : null,
      } : {}),
      ...(d.noWaWali           !== undefined ? { noWaWali: d.noWaWali }             : {}),
      ...(d.isActive           !== undefined ? { isActive: d.isActive }             : {}),
    },
    select: {
      id:                 true,
      nis:                true,
      nama:               true,
      isActive:           true,
      targetPembelajaran: true,
      deadlineTarget:     true,
      noWaWali:           true,
      kelas:              { select: { id: true, nama: true } },
    },
  })

  return NextResponse.json(santri)
}
