/**
 * Helper untuk mengambil data sesi dari header yang diinjeksi middleware.
 * Digunakan di API Route (route.ts) — bukan Server Components.
 */
import { type NextRequest, NextResponse } from 'next/server'
import type { SessionPayload } from './session'

export function getSessionFromHeaders(request: NextRequest): SessionPayload | null {
  const id    = request.headers.get('x-user-id')
  const nama  = request.headers.get('x-user-nama')
  const peran = request.headers.get('x-user-peran') as SessionPayload['peran'] | null

  if (!id || !nama || !peran) return null
  return { id, nama, peran }
}

/**
 * Cek apakah request berasal dari admin.
 * Kembalikan `NextResponse` (4xx) jika tidak terotorisasi,
 * atau `null` jika lolos — sehingga pola `if (check) return check` tetap bekerja.
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const session = getSessionFromHeaders(request)
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 401 })
  }
  if (session.peran !== 'ADMIN') {
    return NextResponse.json({ error: 'Hanya admin yang dapat mengakses endpoint ini.' }, { status: 403 })
  }
  return null
}

/** @deprecated gunakan requireAdmin() + getSessionFromHeaders() secara terpisah */
export function isNextResponse(val: unknown): val is NextResponse {
  return val instanceof NextResponse
}
