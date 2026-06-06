'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'

export interface SantriOption {
  id:    string
  nis:   string
  nama:  string
  kelas: { nama: string } | null
}

interface Props {
  value:       SantriOption | null
  onChange:    (v: SantriOption | null) => void
  placeholder?: string
  /** Hanya tampilkan santri dari kelas ini (opsional) */
  kelasId?:    string
}

export default function SantriCombobox({
  value,
  onChange,
  placeholder = 'Cari nama atau NIS santri…',
  kelasId,
}: Props) {
  const [query,   setQuery]   = useState(value ? value.nama : '')
  const [results, setResults] = useState<SantriOption[]>([])
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Tutup dropdown saat klik luar
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Sinkronkan input dengan value eksternal
  useEffect(() => {
    setQuery(value ? value.nama : '')
  }, [value])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 1) { setResults([]); return }
      setLoading(true)
      try {
        const params = new URLSearchParams({ q: query })
        if (kelasId) params.set('kelasId', kelasId)
        const res  = await fetch(`/api/santri/search?${params}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
        setOpen(true)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, kelasId])

  function select(s: SantriOption) {
    onChange(s)
    setQuery(s.nama)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (!e.target.value) onChange(null) }}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-100 max-h-52 overflow-auto">
          {results.map((s) => (
            <li
              key={s.id}
              onMouseDown={() => select(s)}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-slate-700">{s.nama}</p>
                <p className="text-xs text-slate-400">
                  {s.nis}{s.kelas ? ` · ${s.kelas.nama}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
