import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createSession, COOKIE_NAME, SESSION_TTL_SECONDS } from '@/lib/session'
import { getIp } from '@/lib/get-ip'

// ── Brute-force tracking di memori (tambahan di atas rate limiter global) ──
// key: pengajarId  →  { count: number; resetAt: number }
const failMap = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS  = 5
const LOCKOUT_MS    = 60 * 60 * 1000 // 1 jam

function recordFailure(id: string): number {
  const now  = Date.now()
  const rec  = failMap.get(id)

  if (!rec || now > rec.resetAt) {
    failMap.set(id, { count: 1, resetAt: now + LOCKOUT_MS })
    return 1
  }
  rec.count++
  return rec.count
}

function clearFailures(id: string) {
  failMap.delete(id)
}

function getRemainingLockMs(id: string): number {
  const rec = failMap.get(id)
  if (!rec) return 0
  if (rec.count < MAX_ATTEMPTS) return 0
  const remaining = rec.resetAt - Date.now()
  return remaining > 0 ? remaining : 0
}

// ── Helper log aktivitas (non-blocking) ─────────────────────────────────────
async function logAktivitas(opts: {
  aksi:       string
  detail:     string
  ip:         string
  pengajarId?: string
}) {
  try {
    await prisma.logAktivitas.create({
      data: {
        aksi:       opts.aksi,
        detail:     opts.detail,
        ip:         opts.ip,
        pengajarId: opts.pengajarId ?? null,
      },
    })
  } catch {
    // Log gagal tidak boleh mengganggu response
  }
}

// ── POST /api/auth/login ─────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const ip = getIp(request)

  // Parse body
  let pin: string
  try {
    const body = await request.json()
    pin = String(body?.pin ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 })
  }

  if (!pin || pin.length < 4 || pin.length > 6) {
    return NextResponse.json(
      { error: 'PIN harus 4–6 digit.' },
      { status: 422 },
    )
  }

  // Cari semua akun aktif — PIN bersifat global (tidak ada username)
  // Iterasi dan bandingkan hash; berhenti saat cocok
  let matchedPengajar: {
    id: string; nama: string; peran: string; pinHash: string
  } | null = null

  // Ambil seluruh pengajar aktif (jumlah kecil, < 50 di TPQ)
  const pengajarList = await prisma.pengajar.findMany({
    where:  { isActive: true },
    select: { id: true, nama: true, peran: true, pinHash: true },
  })

  for (const p of pengajarList) {
    const match = await bcrypt.compare(pin, p.pinHash)
    if (match) {
      matchedPengajar = p
      break
    }
  }

  // Jika tidak ada akun yang cocok
  if (!matchedPengajar) {
    await logAktivitas({
      aksi:   'LOGIN_GAGAL',
      detail: `PIN salah dari IP ${ip}`,
      ip,
    })
    return NextResponse.json(
      { error: 'PIN tidak ditemukan. Periksa kembali PIN Anda.' },
      { status: 401 },
    )
  }

  // Cek lockout di memori
  const lockRemaining = getRemainingLockMs(matchedPengajar.id)
  if (lockRemaining > 0) {
    const menitSisa = Math.ceil(lockRemaining / 60_000)
    return NextResponse.json(
      {
        error:      `Akun terkunci karena terlalu banyak percobaan gagal. Coba lagi dalam ${menitSisa} menit.`,
        lockedUntil: Date.now() + lockRemaining,
      },
      { status: 423 },
    )
  }

  // Verifikasi ulang PIN (sudah dilakukan di atas, tapi kita lanjutkan alur normal)
  // Jika sampai sini, PIN cocok — reset counter dan buat session
  clearFailures(matchedPengajar.id)

  const token = createSession({
    id:    matchedPengajar.id,
    nama:  matchedPengajar.nama,
    peran: matchedPengajar.peran as 'ADMIN' | 'PENGAJAR',
  })

  await logAktivitas({
    aksi:       'LOGIN_BERHASIL',
    detail:     `Login berhasil dari IP ${ip}`,
    ip,
    pengajarId: matchedPengajar.id,
  })

  const response = NextResponse.json({
    success: true,
    user: {
      id:    matchedPengajar.id,
      nama:  matchedPengajar.nama,
      peran: matchedPengajar.peran,
    },
  })

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/',
    maxAge:   SESSION_TTL_SECONDS,
    secure:   process.env.NODE_ENV === 'production',
  })

  return response
}

// ── Brute-force: endpoint ini JUGA dipanggil saat PIN salah (dari middleware) ─
// Ekspor handler gagal agar bisa dipanggil dari server action jika diperlukan
export async function handleLoginFailure(pengajarId: string, ip: string) {
  const count = recordFailure(pengajarId)

  if (count >= MAX_ATTEMPTS) {
    await logAktivitas({
      aksi:       'AKUN_TERKUNCI',
      detail:     `Akun terkunci setelah ${count} percobaan gagal dari IP ${ip}`,
      ip,
      pengajarId,
    })
  } else {
    await logAktivitas({
      aksi:       'LOGIN_GAGAL',
      detail:     `Percobaan gagal ke-${count} dari IP ${ip}`,
      ip,
      pengajarId,
    })
  }

  return count
}
