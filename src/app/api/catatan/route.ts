import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionFromHeaders } from '@/lib/auth-server'
import { sendToSantri, catatanPayload } from '@/lib/web-push'
import { logCatatanCreated } from '@/lib/logger'
import { getIp } from '@/lib/get-ip'

const catatanSchema = z.object({
  santriId: z.string().uuid('santriId harus UUID.'),
  isi:      z.string().min(1, 'Isi catatan tidak boleh kosong.').max(2000),
})

// ── POST /api/catatan ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const ip      = getIp(request)
  const session = getSessionFromHeaders(request)
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 401 })
  }

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }

  const parsed = catatanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' },
      { status: 422 },
    )
  }

  // Pastikan santri aktif
  const santri = await prisma.santri.findUnique({
    where:  { id: parsed.data.santriId },
    select: { isActive: true },
  })
  if (!santri?.isActive) {
    return NextResponse.json({ error: 'Santri tidak ditemukan atau tidak aktif.' }, { status: 422 })
  }

  const catatan = await prisma.catatan.create({
    data: {
      santriId:   parsed.data.santriId,
      pengajarId: session.id,
      isi:        parsed.data.isi,
    },
    select: {
      id:        true,
      isi:       true,
      createdAt: true,
      santri:    { select: { nama: true, nis: true } },
      pengajar:  { select: { nama: true } },
    },
  })

  logCatatanCreated({ catatanId: catatan.id, santriId: parsed.data.santriId, pengajarId: session.id, ip })

  // Fire-and-forget push notification
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  sendToSantri(
    parsed.data.santriId,
    catatanPayload({
      santriNama: catatan.santri.nama,
      santriNis:  catatan.santri.nis,
      isi:        catatan.isi,
      appUrl,
    }),
  ).catch(() => {})

  return NextResponse.json(catatan, { status: 201 })
}

// ── GET /api/catatan — catatan terbaru milik pengajar ─────────────────────────
export async function GET(request: NextRequest) {
  const session = getSessionFromHeaders(request)
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 401 })
  }

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? '10'), 50)

  const catatan = await prisma.catatan.findMany({
    where:   { pengajarId: session.id },
    orderBy: { createdAt: 'desc' },
    take:    limit,
    select: {
      id:        true,
      isi:       true,
      createdAt: true,
      santri:    { select: { nama: true, nis: true } },
      pengajar:  { select: { nama: true } },
    },
  })

  return NextResponse.json(catatan)
}
