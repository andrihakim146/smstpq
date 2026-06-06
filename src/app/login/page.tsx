'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router    = useRouter()
  const inputRef  = useRef<HTMLInputElement>(null)
  const [pin, setPin]     = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lockUntil, setLockUntil] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [isPending, startTransition] = useTransition()

  // Countdown timer saat akun terkunci
  useEffect(() => {
    if (!lockUntil) return
    const tick = () => {
      const sisa = Math.ceil((lockUntil - Date.now()) / 1000)
      if (sisa <= 0) {
        setLockUntil(null)
        setCountdown(0)
        setError(null)
      } else {
        setCountdown(sisa)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lockUntil])

  function formatCountdown(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (pin.length < 4) {
      setError('PIN minimal 4 digit.')
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/login', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ pin }),
        })

        const text = await res.text()
        let data: {
          success?:     boolean
          error?:       string
          lockedUntil?: number
          user?:        { peran: string }
        } = {}

        if (text) {
          try {
            data = JSON.parse(text)
          } catch {
            setError('Server mengembalikan respons tidak valid. Coba lagi.')
            return
          }
        } else if (!res.ok) {
          setError(`Server error (${res.status}). Periksa konfigurasi database di Netlify.`)
          return
        }

        if (res.ok && data.success && data.user) {
          // Redirect sesuai peran
          const dest = data.user.peran === 'ADMIN' ? '/admin/dashboard' : '/pengajar/dashboard'
          router.push(dest)
          return
        }

        // Akun terkunci (423)
        if (res.status === 423 && data.lockedUntil) {
          setLockUntil(data.lockedUntil)
          setError(data.error ?? 'Akun terkunci sementara.')
          setPin('')
          return
        }

        // Rate limited (429)
        if (res.status === 429) {
          const retryAfter = Number(res.headers.get('Retry-After') ?? 60)
          setLockUntil(Date.now() + retryAfter * 1000)
          setError(data.error ?? 'Terlalu banyak percobaan. Coba lagi nanti.')
          setPin('')
          return
        }

        setError(data.error ?? 'Login gagal. Periksa PIN Anda.')
        setPin('')
        inputRef.current?.focus()
      } catch {
        setError('Terjadi kesalahan koneksi. Coba lagi.')
      }
    })
  }

  const isLocked = lockUntil !== null && Date.now() < lockUntil

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Judul */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500 text-white text-3xl mb-4 shadow-lg">
            📖
          </div>
          <h1 className="text-2xl font-bold text-slate-800">SMSTPQ</h1>
          <p className="text-slate-500 text-sm mt-1">Sistem Manajemen Santri TPQ</p>
        </div>

        <Card className="rounded-3xl shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center text-slate-700">
              Masuk dengan PIN
            </CardTitle>
            <CardDescription className="text-center text-slate-400">
              Masukkan PIN 4–6 digit Anda
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Input PIN */}
              <div className="space-y-1.5">
                <Input
                  ref={inputRef}
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="••••••"
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '')
                    setPin(val)
                    setError(null)
                  }}
                  disabled={isLocked || isPending}
                  className="text-center text-2xl tracking-[0.5em] h-14 rounded-2xl border-slate-200 focus:border-blue-400 focus:ring-blue-400"
                  autoComplete="current-password"
                  autoFocus
                />
              </div>

              {/* Pesan error */}
              {error && !isLocked && (
                <p className="text-sm text-red-500 text-center rounded-xl bg-red-50 px-3 py-2">
                  {error}
                </p>
              )}

              {/* Countdown terkunci */}
              {isLocked && (
                <div className="text-center rounded-2xl bg-amber-50 border border-amber-200 px-3 py-3">
                  <p className="text-sm font-semibold text-amber-700">
                    🔒 Akun terkunci sementara
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Coba lagi dalam{' '}
                    <span className="font-mono font-bold text-amber-800">
                      {formatCountdown(countdown)}
                    </span>
                  </p>
                </div>
              )}

              {/* Tombol masuk */}
              <Button
                type="submit"
                disabled={pin.length < 4 || isLocked || isPending}
                className="w-full h-12 rounded-2xl bg-amber-400 hover:bg-amber-500 text-white font-semibold text-base shadow-md disabled:opacity-50"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Memverifikasi...
                  </span>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>

            {/* Panduan wali */}
            <p className="text-xs text-slate-400 text-center mt-4">
              Wali murid?{' '}
              <a href="/panduan" className="text-blue-500 underline underline-offset-2">
                Akses halaman santri via NIS
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
