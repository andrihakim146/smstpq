import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET ?? 'smstpq-dev-secret-change-in-prod'
const COOKIE_NAME = 'smstpq_session'
const SESSION_TTL_SECONDS = 8 * 60 * 60 // 8 jam

export interface SessionPayload {
  id:    string
  nama:  string
  peran: 'ADMIN' | 'PENGAJAR'
  iat?:  number
  exp?:  number
}

/** Buat token JWT berisi data pengajar dan set cookie httpOnly. */
export function createSession(payload: Omit<SessionPayload, 'iat' | 'exp'>): string {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_TTL_SECONDS })
  return token
}

/** Verifikasi token JWT dan kembalikan payload, atau null jika tidak valid. */
export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload
  } catch {
    return null
  }
}

/**
 * Ambil session dari cookie server-side (Server Component / Server Action).
 * Kembalikan null jika tidak ada atau token tidak valid.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

/** Nama cookie — digunakan di API route saat set/delete cookie. */
export { COOKIE_NAME, SESSION_TTL_SECONDS }
