/**
 * Verifikasi JWT di Edge Middleware (Netlify).
 * `jsonwebtoken` tidak kompatibel dengan Edge runtime — gunakan `jose`.
 */
import { jwtVerify } from 'jose'
import type { SessionPayload } from './session'

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? 'smstpq-dev-secret-change-in-prod'
  return new TextEncoder().encode(secret)
}

export async function verifyTokenEdge(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const id    = payload.id
    const nama  = payload.nama
    const peran = payload.peran
    if (typeof id !== 'string' || typeof nama !== 'string' || typeof peran !== 'string') {
      return null
    }
    if (peran !== 'ADMIN' && peran !== 'PENGAJAR') return null
    return { id, nama, peran: peran as SessionPayload['peran'] }
  } catch {
    return null
  }
}
