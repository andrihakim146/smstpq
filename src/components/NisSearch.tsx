'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SearchIcon, Loader2Icon } from 'lucide-react'
import { Input }  from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function NisSearch() {
  const router = useRouter()
  const [nis, setNis]         = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [isPending, startTx]  = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmed = nis.trim()

    if (!/^\d{8}$/.test(trimmed)) {
      setError('NIS harus tepat 8 digit angka. Contoh: 20260001')
      return
    }

    startTx(() => {
      router.push(`/santri/${trimmed}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            placeholder="Masukkan NIS (8 digit)…"
            value={nis}
            onChange={(e) => {
              setNis(e.target.value.replace(/\D/g, ''))
              setError(null)
            }}
            className="pl-9 h-12 rounded-2xl border-slate-200 focus:border-blue-400 text-base"
          />
        </div>
        <Button
          type="submit"
          disabled={nis.length !== 8 || isPending}
          className="h-12 px-6 rounded-2xl bg-amber-400 hover:bg-amber-500 text-white font-semibold shadow-md disabled:opacity-50 shrink-0"
        >
          {isPending
            ? <Loader2Icon className="w-4 h-4 animate-spin" />
            : 'Cari'}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-500 text-center bg-red-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <p className="text-xs text-slate-400 text-center">
        NIS tercetak di kartu santri atau dapat diperoleh dari pengajar.
      </p>
    </form>
  )
}
