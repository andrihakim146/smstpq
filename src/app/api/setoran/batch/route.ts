import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionFromHeaders } from '@/lib/auth-server'
import { VALID_SURAH_NAMES, getMaxAyat } from '@/lib/surah'

const itemSchema = z.object({
  santriId:      z.string().uuid(),
  tanggal:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipe:          z.enum(['AL_QURAN', 'PRA_TAHSIN']),
  surah:         z.string().optional().nullable(),
  ayatMulai:     z.number().int().min(1).optional().nullable(),
  ayatSelesai:   z.number().int().min(1).optional().nullable(),
  kategori:      z.string().optional().nullable(),
  kitabId:       z.string().optional().nullable(),
  halamanMulai:  z.number().int().min(1).optional().nullable(),
  halamanSelesai:z.number().int().min(1).optional().nullable(),
  nilai:         z.string().optional().nullable(),
})

const batchSchema = z.object({
  items: z.array(itemSchema).min(1).max(100),
})

// ── POST /api/setoran/batch ───────────────────────────────────────────────────
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
    return NextResponse.json({ error: 'Format batch tidak valid.' }, { status: 422 })
  }

  const results: { index: number; success: boolean; error?: string }[] = []

  for (let i = 0; i < parsed.data.items.length; i++) {
    const item = parsed.data.items[i]

    try {
      // Validasi ringan
      if (item.tipe === 'AL_QURAN') {
        if (!item.surah || !VALID_SURAH_NAMES.has(item.surah)) throw new Error(`Surah tidak valid: ${item.surah}`)
        if (!item.ayatMulai || !item.ayatSelesai) throw new Error('Ayat wajib diisi.')
        if (item.ayatMulai > item.ayatSelesai) throw new Error('Ayat mulai > ayat selesai.')
        if (item.ayatSelesai > getMaxAyat(item.surah)) throw new Error('Ayat melebihi batas surah.')
      }
      if (item.tipe === 'PRA_TAHSIN') {
        if (!item.kitabId) throw new Error('Kitab wajib dipilih.')
        if (!item.halamanMulai || !item.halamanSelesai) throw new Error('Halaman wajib diisi.')
        if (item.halamanMulai > item.halamanSelesai) throw new Error('Halaman mulai > halaman selesai.')
      }

      await prisma.setoran.create({
        data: {
          santriId:      item.santriId,
          pengajarId:    session.id,
          tanggal:       new Date(item.tanggal),
          tipe:          item.tipe,
          surah:         item.surah         ?? null,
          ayatMulai:     item.ayatMulai     ?? null,
          ayatSelesai:   item.ayatSelesai   ?? null,
          kategori:      item.kategori as 'ZIYADAH' | 'MUROJAAH' | null ?? null,
          kitabId:       item.kitabId       ?? null,
          halamanMulai:  item.halamanMulai  ?? null,
          halamanSelesai:item.halamanSelesai ?? null,
          nilai:         item.nilai         ?? null,
        },
      })

      results.push({ index: i, success: true })
    } catch (err) {
      results.push({
        index:   i,
        success: false,
        error:   err instanceof Error ? err.message : 'Gagal menyimpan.',
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
