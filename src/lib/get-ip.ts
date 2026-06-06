import type { NextRequest } from 'next/server'

/**
 * Ekstrak IP address dari request.
 * Mengutamakan header x-forwarded-for (Netlify / reverse proxy),
 * lalu x-real-ip, lalu ip bawaan Next.js.
 * Fallback ke '127.0.0.1' agar rate limiter tetap bisa bekerja.
 */
export function getIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for bisa berisi daftar IP dipisah koma; ambil yang pertama
    const first = forwarded.split(',')[0].trim()
    if (first) return first
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  // Next.js 13+ menyediakan request.ip di Edge Runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ip = (request as any).ip as string | undefined
  if (ip) return ip

  return '127.0.0.1'
}
