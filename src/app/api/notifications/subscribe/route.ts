import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const subscribeSchema = z.object({
  santriNis: z.string().length(8).regex(/^\d+$/),
  endpoint:  z.string().url(),
  p256dh:    z.string().min(1),
  auth:      z.string().min(1),
})

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
})

// POST /api/notifications/subscribe — daftarkan subscription baru
export async function POST(request: NextRequest) {
  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }

  const parsed = subscribeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 422 })
  }

  const { santriNis, endpoint, p256dh, auth } = parsed.data

  const santri = await prisma.santri.findUnique({
    where:  { nis: santriNis },
    select: { id: true, isActive: true },
  })
  if (!santri?.isActive) {
    return NextResponse.json({ error: 'Santri tidak ditemukan.' }, { status: 404 })
  }

  // Upsert berdasarkan endpoint (satu endpoint = satu device)
  const sub = await prisma.pushSubscription.upsert({
    where:  { endpoint },
    create: { santriId: santri.id, endpoint, p256dh, auth },
    update: { santriId: santri.id, p256dh, auth },
    select: { id: true },
  })

  return NextResponse.json({ ok: true, id: sub.id }, { status: 201 })
}

// DELETE /api/notifications/subscribe — hapus subscription
export async function DELETE(request: NextRequest) {
  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }

  const parsed = unsubscribeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Endpoint tidak valid.' }, { status: 422 })
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint } })
  return NextResponse.json({ ok: true })
}
