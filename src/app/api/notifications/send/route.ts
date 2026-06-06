import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionFromHeaders } from '@/lib/auth-server'
import { sendToSantri, type PushPayload } from '@/lib/web-push'

const sendSchema = z.object({
  santriId: z.string().uuid(),
  payload:  z.object({
    title:     z.string(),
    body:      z.string(),
    url:       z.string(),
    tag:       z.string().optional(),
    santriNis: z.string().optional(),
  }),
})

// POST /api/notifications/send — kirim push ke semua subscriber santri
// Dipanggil internal dari API setoran/catatan (hanya dari request yang sudah auth)
export async function POST(request: NextRequest) {
  const session = getSessionFromHeaders(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }

  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid.' }, { status: 422 })
  }

  const { santriId, payload } = parsed.data
  const result = await sendToSantri(santriId, payload as PushPayload)
  return NextResponse.json(result)
}
