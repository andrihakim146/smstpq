import { NextRequest, NextResponse } from 'next/server'
import { getIp } from '@/lib/get-ip'
import { publicLimiter, loginLimiter, RateLimiterRes } from '@/lib/rate-limiter'
import { verifyToken, COOKIE_NAME } from '@/lib/session'
import { logRateLimit } from '@/lib/logger'

// ── Path yang sepenuhnya di-skip middleware ───────────────────────────────────
const BYPASS_PREFIXES = [
  '/_next/',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js',
  '/icons/',
]

function isBypassPath(pathname: string): boolean {
  return BYPASS_PREFIXES.some((p) => pathname.startsWith(p))
}

// ── Rute yang butuh sesi terautentikasi ──────────────────────────────────────
const PROTECTED_PREFIXES = ['/admin', '/pengajar']

// Rute yang hanya boleh diakses oleh ADMIN
const ADMIN_ONLY_PREFIXES = ['/admin']

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
}

function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))
}

// ── Helper: response 429 ─────────────────────────────────────────────────────
function tooManyRequests(msBeforeNext: number, message: string): NextResponse {
  const retryAfterSec = Math.ceil(msBeforeNext / 1000)
  return NextResponse.json(
    { error: message, retryAfter: retryAfterSec },
    {
      status: 429,
      headers: {
        'Retry-After':       String(retryAfterSec),
        'X-RateLimit-Reset': String(Date.now() + msBeforeNext),
      },
    },
  )
}

// ── Helper: redirect ke login ─────────────────────────────────────────────────
function redirectToLogin(request: NextRequest, reason?: string): NextResponse {
  const loginUrl = new URL('/login', request.url)
  if (reason) loginUrl.searchParams.set('reason', reason)
  // Simpan URL asal agar bisa redirect balik setelah login
  loginUrl.searchParams.set('from', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

// ── Helper: response 403 untuk API ───────────────────────────────────────────
function forbidden(message = 'Akses ditolak.'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 })
}

// ── Middleware utama ──────────────────────────────────────────────────────────
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // 1. Lewati asset statis & internal Next.js
  if (isBypassPath(pathname)) return NextResponse.next()

  const ip = getIp(request)

  // ── 2. Rate limit endpoint LOGIN ─────────────────────────────────────────
  // Jangan baca request body di middleware — di Netlify Edge runtime body
  // bisa ikut terkonsumsi dan API route menerima body kosong ("Body tidak valid").
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    try {
      await loginLimiter.consume(ip)
    } catch (err) {
      if (err instanceof RateLimiterRes) {
        logRateLimit({ path: pathname, ip, key: ip })
        return tooManyRequests(
          err.msBeforeNext,
          'Terlalu banyak percobaan login. Coba lagi dalam 1 jam.',
        )
      }
    }
  }

  // ── 3. Rate limit endpoint PUBLIK ────────────────────────────────────────
  if (pathname.startsWith('/api/public') || pathname.startsWith('/santri')) {
    try {
      await publicLimiter.consume(ip)
    } catch (err) {
      if (err instanceof RateLimiterRes) {
        logRateLimit({ path: pathname, ip, key: ip })
        return tooManyRequests(
          err.msBeforeNext,
          'Terlalu banyak permintaan. Silakan tunggu sebentar.',
        )
      }
    }
  }

  // ── 4. Proteksi rute autentikasi ─────────────────────────────────────────
  if (isProtectedPath(pathname)) {
    const token = request.cookies.get(COOKIE_NAME)?.value

    // Tidak ada session → redirect ke login
    if (!token) {
      // Untuk API route yang di-protect, kembalikan 401 bukan redirect
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Sesi tidak ditemukan. Silakan login.' }, { status: 401 })
      }
      return redirectToLogin(request, 'unauthenticated')
    }

    const session = verifyToken(token)

    // Token tidak valid / expired
    if (!session) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Sesi tidak valid atau telah berakhir.' }, { status: 401 })
      }
      return redirectToLogin(request, 'expired')
    }

    // Rute admin: hanya boleh ADMIN
    if (isAdminOnlyPath(pathname) && session.peran !== 'ADMIN') {
      if (pathname.startsWith('/api/')) return forbidden('Hanya admin yang dapat mengakses endpoint ini.')
      return NextResponse.redirect(new URL('/pengajar/dashboard', request.url))
    }

    // Teruskan request dengan informasi sesi di header REQUEST
    // (bukan response header) agar API route dapat membacanya via getSessionFromHeaders()
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id',    session.id)
    requestHeaders.set('x-user-nama',  session.nama)
    requestHeaders.set('x-user-peran', session.peran)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // ── 5. Redirect /login jika sudah login ──────────────────────────────────
  if (pathname === '/login') {
    const token = request.cookies.get(COOKIE_NAME)?.value
    if (token) {
      const session = verifyToken(token)
      if (session) {
        const dest = session.peran === 'ADMIN' ? '/admin/dashboard' : '/pengajar/dashboard'
        return NextResponse.redirect(new URL(dest, request.url))
      }
    }
  }

  return NextResponse.next()
}

// ── Konfigurasi matcher ───────────────────────────────────────────────────────
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
