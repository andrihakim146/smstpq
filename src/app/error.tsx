'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react'

interface Props {
  error:  Error & { digest?: string }
  reset:  () => void
}

/**
 * Global client-side error boundary (Next.js App Router).
 * Menangkap error tak tertangani di tree komponen,
 * menampilkan UI fallback, dan mengirim log ke console.
 */
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Structured log — terbaca di Netlify log drain / browser console
    console.error(JSON.stringify({
      ts:      new Date().toISOString(),
      level:   'error',
      event:   'CLIENT_ERROR_BOUNDARY',
      message: error.message,
      digest:  error.digest,
      stack:   error.stack?.split('\n').slice(0, 5).join(' | '),
      url:     typeof window !== 'undefined' ? window.location.href : '',
    }))
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangleIcon className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Terjadi Kesalahan</h1>
          <p className="text-slate-500 text-sm">
            Ada sesuatu yang tidak berjalan dengan benar.
            Silakan coba lagi atau muat ulang halaman.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-slate-400 font-mono">
              Kode: {error.digest}
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="default" className="gap-2">
            <RefreshCwIcon className="w-4 h-4" />
            Coba Lagi
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            Ke Beranda
          </Button>
        </div>
      </div>
    </div>
  )
}
