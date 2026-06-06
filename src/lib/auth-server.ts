/**
 * Helper untuk mengambil data sesi di API Route (route.ts).
 * Strategi berlapis:
 *   1. Baca header x-user-* yang diinjeksi middleware (server-to-server / test)
 *   2. Fallback: verifikasi JWT dari cookie secara langsung
 */
import { type NextRequest, NextResponse } from 'next/server'
import { verifyToken, COOKIE_NAME, type SessionPayload } from './session'

export function getSessionFromHeaders(request: NextRequest): SessionPayload | null {
  // Coba header injeksi middleware terlebih dahulu
  const id    = request.headers.get('x-user-id')
  const nama  = request.headers.get('x-user-nama')
  const peran = request.headers.get('x-user-peran') as SessionPayload['peran'] | null

  if (id && nama && peran) return { id, nama, peran }

  // Fallback: baca JWT langsung dari cookie (browser request)
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
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
