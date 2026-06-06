import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionFromHeaders } from '@/lib/auth-server'

const STATUS_VALUES = ['HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT'] as const

const itemSchema = z.object({
  santriId:   z.string().uuid(),
  tanggal:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.'),
  status:     z.enum(STATUS_VALUES),
  keterangan: z.string().max(255).optional().nullable(),
})

const batchSchema = z.object({
  items: z.array(itemSchema).min(1, 'Minimal 1 item.').max(200),
})

/**
 * POST /api/absensi/batch
 * Upsert absensi untuk banyak santri sekaligus.
 * Menggunakan upsert berdasarkan unique constraint [santriId, tanggal].
 */
export async function POST(request: NextRequest) {
  const session = getSessionFromHeaders(request)
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 401 })
  }

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }

  const parsed = batchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' },
      { status: 422 },
    )
  }

  const results: { santriId: string; success: boolean; error?: string }[] = []

  for (const item of parsed.data.items) {
    try {
      await prisma.absensi.upsert({
        where: {
          santriId_tanggal: {
            santriId: item.santriId,
            tanggal:  new Date(item.tanggal),
          },
        },
        update: {
          status:     item.status,
          keterangan: item.keterangan ?? null,
        },
        create: {
          santriId:   item.santriId,
          tanggal:    new Date(item.tanggal),
          status:     item.status,
          keterangan: item.keterangan ?? null,
        },
      })
      results.push({ santriId: item.santriId, success: true })
    } catch (err) {
      results.push({
        santriId: item.santriId,
        success:  false,
        error:    err instanceof Error ? err.message : 'Gagal upsert.',
      })
    }
  }

  const successCount = results.filter((r) => r.success).length
  return NextResponse.json({
    total:   parsed.data.items.length,
    success: successCount,
    failed:  parsed.data.items.length - successCount,
    results,
  })
}
