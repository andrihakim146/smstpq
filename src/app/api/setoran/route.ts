import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionFromHeaders } from '@/lib/auth-server'
import { VALID_SURAH_NAMES, getMaxAyat } from '@/lib/surah'
import { sendToSantri, setoranPayload } from '@/lib/web-push'

// ── Schema validasi ────────────────────────────────────────────────────────────
const baseSchema = z.object({
  santriId: z.string().uuid(),
  tanggal:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
})

const alQuranSchema = baseSchema.extend({
  tipe:       z.literal('AL_QURAN'),
  surah:      z.string().min(1),
  ayatMulai:  z.number().int().min(1),
  ayatSelesai:z.number().int().min(1),
  kategori:   z.enum(['ZIYADAH', 'MUROJAAH']).optional().nullable(),
  nilai:      z.string().max(50).optional().nullable(),
})

const praTahsinSchema = baseSchema.extend({
  tipe:          z.literal('PRA_TAHSIN'),
  kitabId:       z.string().uuid(),
  halamanMulai:  z.number().int().min(1),
  halamanSelesai:z.number().int().min(1),
  nilai:         z.string().max(50).optional().nullable(),
})

const setoranSchema = z.discriminatedUnion('tipe', [alQuranSchema, praTahsinSchema])

// ── Validasi bisnis ─────────────────────────────────────────────────────────
async function validateBusiness(data: z.infer<typeof setoranSchema>) {
  // Cek santri ada & aktif
  const santri = await prisma.santri.findUnique({
    where:  { id: data.santriId },
    select: { isActive: true },
  })
  if (!santri?.isActive) return 'Santri tidak ditemukan atau tidak aktif.'

  if (data.tipe === 'AL_QURAN') {
    if (!VALID_SURAH_NAMES.has(data.surah)) return `Nama surah tidak valid: ${data.surah}`
    const max = getMaxAyat(data.surah)
    if (data.ayatMulai > data.ayatSelesai) return 'Ayat mulai tidak boleh lebih besar dari ayat selesai.'
    if (data.ayatSelesai > max) return `Surah ${data.surah} hanya memiliki ${max} ayat.`
  }

  if (data.tipe === 'PRA_TAHSIN') {
    const kitab = await prisma.kitab.findUnique({
      where:  { id: data.kitabId },
      select: { isActive: true },
    })
    if (!kitab?.isActive) return 'Kitab tidak ditemukan atau tidak aktif.'
    if (data.halamanMulai > data.halamanSelesai) return 'Halaman mulai tidak boleh lebih besar dari halaman selesai.'
  }

  return null
}

// ── POST /api/setoran ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = getSessionFromHeaders(request)
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 401 })
  }

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }

  const parsed = setoranSchema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues ?? (parsed.error as unknown as { errors: {message:string}[] }).errors
    return NextResponse.json({ error: issues[0]?.message ?? 'Data tidak valid.' }, { status: 422 })
  }

  const errMsg = await validateBusiness(parsed.data)
  if (errMsg) return NextResponse.json({ error: errMsg }, { status: 422 })

  const d = parsed.data
  const setoran = await prisma.setoran.create({
    data: {
      santriId:    d.santriId,
      pengajarId:  session.id,
      tanggal:     new Date(d.tanggal),
      tipe:        d.tipe,
      surah:       d.tipe === 'AL_QURAN'   ? d.surah      : null,
      ayatMulai:   d.tipe === 'AL_QURAN'   ? d.ayatMulai  : null,
      ayatSelesai: d.tipe === 'AL_QURAN'   ? d.ayatSelesai: null,
      kategori:    d.tipe === 'AL_QURAN'   ? (d.kategori ?? null) : null,
      kitabId:     d.tipe === 'PRA_TAHSIN' ? d.kitabId    : null,
      halamanMulai:  d.tipe === 'PRA_TAHSIN' ? d.halamanMulai   : null,
      halamanSelesai:d.tipe === 'PRA_TAHSIN' ? d.halamanSelesai : null,
      nilai:       d.nilai ?? null,
    },
    select: {
      id:       true,
      tanggal:  true,
      tipe:     true,
      surah:    true,
      ayatMulai:true,
      ayatSelesai:true,
      nilai:    true,
      halamanMulai: true,
      halamanSelesai: true,
      pengajar: { select: { nama: true } },
      kitab:    { select: { nama: true } },
      santri:   { select: { nama: true, nis: true, noWaWali: true } },
    },
  })

  // Kirim push notification secara fire-and-forget (jangan blokir response)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const detail = setoran.tipe === 'AL_QURAN'
    ? `${setoran.surah} ${setoran.ayatMulai}–${setoran.ayatSelesai}`
    : `${setoran.kitab?.nama} hal. ${setoran.halamanMulai}–${setoran.halamanSelesai}`
  sendToSantri(
    d.santriId,
    setoranPayload({
      santriNama: setoran.santri.nama,
      santriNis:  setoran.santri.nis,
      tipe:       setoran.tipe,
      detail,
      nilai:      setoran.nilai,
      appUrl,
    }),
  ).catch(() => {})

  return NextResponse.json(setoran, { status: 201 })
}

// ── GET /api/setoran — 5 setoran terbaru milik pengajar ──────────────────────
export async function GET(request: NextRequest) {
  const session = getSessionFromHeaders(request)
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 401 })
  }

  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '5')

  const setoran = await prisma.setoran.findMany({
    where:   { pengajarId: session.id },
    orderBy: { tanggal: 'desc' },
    take:    Math.min(limit, 50),
    select: {
      id:             true,
      tanggal:        true,
      tipe:           true,
      surah:          true,
      ayatMulai:      true,
      ayatSelesai:    true,
      nilai:          true,
      halamanMulai:   true,
      halamanSelesai: true,
      kategori:       true,
      pengajar: { select: { nama: true } },
      kitab:    { select: { nama: true } },
      santri:   { select: { nama: true, nis: true, noWaWali: true } },
    },
  })

  return NextResponse.json(setoran)
}
