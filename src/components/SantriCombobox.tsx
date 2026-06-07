'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  kelasId?:    string
}

export default function SantriCombobox({
  value,
  onChange,
  placeholder = 'Ketuk untuk pilih santri…',
  kelasId,
}: Props) {
  const [query,   setQuery]   = useState(value ? value.nama : '')
  const [results, setResults] = useState<SantriOption[]>([])
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    setQuery(value ? value.nama : '')
  }, [value])

  const fetchResults = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (kelasId) params.set('kelasId', kelasId)
      const res  = await fetch(`/api/santri/search?${params}`, { credentials: 'include' })
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [kelasId])

  // Filter saat mengetik
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => fetchResults(query), query.trim() ? 250 : 0)
    return () => clearTimeout(timer)
  }, [query, open, fetchResults])

  function handleFocus() {
    setOpen(true)
    fetchResults(query)
  }

  function select(s: SantriOption) {
    onChange(s)
    setQuery(s.nama)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!e.target.value) onChange(null)
            setOpen(true)
          }}
          onFocus={handleFocus}
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
        )}
      </div>

      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-100 max-h-60 overflow-auto">
          {loading && results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-400 text-center">Memuat…</li>
          ) : results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-400 text-center">
              {query.trim() ? 'Santri tidak ditemukan.' : 'Belum ada santri aktif.'}
            </li>
          ) : (
            results.map((s) => (
              <li
                key={s.id}
                onMouseDown={() => select(s)}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{s.nama}</p>
                  <p className="text-xs text-slate-400">
                    {s.nis}{s.kelas ? ` · ${s.kelas.nama}` : ''}
                  </p>
                </div>
              </li>
            ))
          )}
          {!query.trim() && results.length > 0 && (
            <li className="px-4 py-2 text-[10px] text-slate-400 text-center border-t border-slate-100 bg-slate-50">
              Ketik nama atau NIS untuk memfilter
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
