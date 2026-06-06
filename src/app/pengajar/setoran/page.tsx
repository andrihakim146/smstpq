'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input }   from '@/components/ui/input'
import { Button }  from '@/components/ui/button'
import { Badge }   from '@/components/ui/badge'
import {
  Search, BookMarked, Loader2, WifiOff, Wifi,
  RefreshCw, CheckCircle, BookOpen,
} from 'lucide-react'
import { SURAH_LIST } from '@/lib/surah'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import SantriCombobox, { type SantriOption } from '@/components/SantriCombobox'
import WhatsAppButton from '@/components/WhatsAppButton'

// ── Types ──────────────────────────────────────────────────────────────────────
type SantriResult = SantriOption
interface Kitab        { id: string; nama: string }
interface SetoranItem {
  id:             string
  tanggal:        string
  tipe:           string
  surah:          string | null
  ayatMulai:      number | null
  ayatSelesai:    number | null
  kategori:       string | null
  nilai:          string | null
  halamanMulai:   number | null
  halamanSelesai: number | null
  santri:         { nama: string; nis: string; noWaWali?: string | null }
  kitab:          { nama: string } | null
  pengajar:       { nama: string }
}

/** Setoran yang baru saja berhasil disimpan — ditampilkan di success card. */
interface LastSaved {
  item:   SetoranItem
  santri: { nama: string; nis: string; noWaWali?: string | null }
}

// ── Surah Combobox ─────────────────────────────────────────────────────────────
function SurahCombobox({
  value,
  onChange,
}: {
  value:    string
  onChange: (v: string) => void
}) {
  const [query, setQuery]   = useState(value)
  const [open,  setOpen]    = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? SURAH_LIST.filter((s) =>
        s.nama.toLowerCase().includes(query.toLowerCase()) ||
        String(s.no).startsWith(query),
      ).slice(0, 20)
    : SURAH_LIST.slice(0, 20)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function select(nama: string) { onChange(nama); setQuery(nama); setOpen(false) }

  return (
    <div ref={ref} className="relative">
      <Input
        placeholder="Pilih surah…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(''); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-100 max-h-52 overflow-auto">
          {filtered.map((s) => (
            <li
              key={s.no}
              onMouseDown={() => select(s.nama)}
              className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-blue-50 text-sm"
            >
              <span className="w-7 text-center text-xs text-slate-400 font-mono">{s.no}</span>
              <span className="font-medium text-slate-700">{s.nama}</span>
              <span className="ml-auto text-xs text-slate-400">{s.maxAyat} ayat</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Label setoran untuk ringkasan ──────────────────────────────────────────────
function SetoranLabel(s: SetoranItem) {
  if (s.tipe === 'AL_QURAN') return `${s.surah} ${s.ayatMulai}–${s.ayatSelesai}`
  if (s.tipe === 'PRA_TAHSIN' && s.kitab) return `${s.kitab.nama} hal. ${s.halamanMulai}–${s.halamanSelesai}`
  return '—'
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function SetoranPage() {
  // Offline queue
  const { isOnline, queueSize, isSyncing, enqueue, syncAll } = useOfflineQueue()

  // Form state
  const [santri,    setSantri]    = useState<SantriResult | null>(null)
  const [tipe,      setTipe]      = useState<'AL_QURAN' | 'PRA_TAHSIN'>('AL_QURAN')
  const [tanggal,   setTanggal]   = useState(() => new Date().toISOString().split('T')[0])
  const [submitting,setSubmitting]= useState(false)
  const [lastSaved, setLastSaved] = useState<LastSaved | null>(null)

  // Al-Quran fields
  const [surah,         setSurah]        = useState('')
  const [ayatMulai,     setAyatMulai]    = useState('')
  const [ayatSelesai,   setAyatSelesai]  = useState('')
  const [kategori,      setKategori]     = useState<'ZIYADAH' | 'MUROJAAH' | ''>('')
  const [nilaiAQ,       setNilaiAQ]      = useState('')

  // Pra-Tahsin fields
  const [kitabId,          setKitabId]         = useState('')
  const [halamanMulai,     setHalamanMulai]    = useState('')
  const [halamanSelesai,   setHalamanSelesai]  = useState('')
  const [nilaiPT,          setNilaiPT]         = useState('')

  // Data
  const [kitabList,    setKitabList]    = useState<Kitab[]>([])
  const [recentSetoran,setRecentSetoran]= useState<SetoranItem[]>([])
  const [loadingRecent,setLoadingRecent]= useState(false)

  // Fetch kitab & recent setoran
  const fetchRecent = useCallback(async () => {
    setLoadingRecent(true)
    try {
      const res  = await fetch('/api/setoran?limit=5')
      const data = await res.json()
      setRecentSetoran(Array.isArray(data) ? data : [])
    } finally { setLoadingRecent(false) }
  }, [])

  useEffect(() => {
    fetch('/api/kitab/active').then((r) => r.json()).then(setKitabList).catch(() => {})
    fetchRecent()
  }, [fetchRecent])

  function resetForm() {
    setSantri(null); setSurah(''); setAyatMulai(''); setAyatSelesai('')
    setKategori(''); setNilaiAQ(''); setKitabId('')
    setHalamanMulai(''); setHalamanSelesai(''); setNilaiPT('')
    setTanggal(new Date().toISOString().split('T')[0])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!santri) { toast.error('Pilih santri terlebih dahulu.'); return }
    if (tipe === 'AL_QURAN' && !surah) { toast.error('Pilih surah.'); return }
    if (tipe === 'AL_QURAN' && (!ayatMulai || !ayatSelesai)) { toast.error('Isi ayat mulai dan selesai.'); return }
    if (tipe === 'PRA_TAHSIN' && !kitabId) { toast.error('Pilih kitab.'); return }
    if (tipe === 'PRA_TAHSIN' && (!halamanMulai || !halamanSelesai)) { toast.error('Isi halaman mulai dan selesai.'); return }

    const payload: Record<string, unknown> = {
      santriId: santri.id,
      tanggal,
      tipe,
      ...(tipe === 'AL_QURAN'
        ? {
            surah,
            ayatMulai:   Number(ayatMulai),
            ayatSelesai: Number(ayatSelesai),
            kategori:    kategori || null,
            nilai:       nilaiAQ  || null,
          }
        : {
            kitabId,
            halamanMulai:   Number(halamanMulai),
            halamanSelesai: Number(halamanSelesai),
            nilai:          nilaiPT || null,
          }),
    }

    setSubmitting(true)
    setLastSaved(null)
    try {
      if (!navigator.onLine) {
        // Simpan ke antrian offline via hook
        await enqueue(payload)
        toast.info(`Tersimpan ke antrian offline. ${queueSize + 1} item menunggu sync.`)
        resetForm()
        return
      }

      // Online: kirim langsung agar kita dapat response data (termasuk noWaWali)
      const res  = await fetch('/api/setoran', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Gagal menyimpan setoran.')
        return
      }

      toast.success('Setoran berhasil disimpan!')
      setLastSaved({ item: data as SetoranItem, santri: (data as SetoranItem).santri })
      resetForm()
      fetchRecent()
    } finally { setSubmitting(false) }
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header + status offline */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Input Setoran</h1>
          <p className="text-slate-500 text-sm mt-0.5">Catat setoran Al-Qur&apos;an atau Pra-Tahsin santri</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status online/offline */}
          <div className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 ${
            isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>

          {/* Badge antrian */}
          {queueSize > 0 && (
            <button
              onClick={syncAll}
              disabled={!isOnline || isSyncing}
              className="flex items-center gap-1.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full px-3 py-1.5 hover:bg-amber-200 disabled:opacity-50 transition-colors"
            >
              {isSyncing
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />
              }
              {queueSize} pending
            </button>
          )}
        </div>
      </div>

      {/* Form card */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-0 pt-5 px-6">
          <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
            <BookMarked className="w-4 h-4" /> Form Setoran Baru
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Santri */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Santri</label>
              <SantriCombobox value={santri} onChange={setSantri} />
              {santri && (
                <p className="text-xs text-blue-600 font-medium">
                  NIS {santri.nis} · {santri.kelas?.nama ?? 'Tanpa kelas'}
                </p>
              )}
            </div>

            {/* Tanggal */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Tanggal Setoran</label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>

            {/* Tipe pembelajaran */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Tipe Pembelajaran</label>
              <div className="flex gap-2">
                {(['AL_QURAN', 'PRA_TAHSIN'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipe(t)}
                    className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold border-2 transition-colors ${
                      tipe === t
                        ? t === 'AL_QURAN'
                          ? 'border-violet-500 bg-violet-50 text-violet-700'
                          : 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {t === 'AL_QURAN' ? "Al-Qur'an" : 'Pra-Tahsin'}
                  </button>
                ))}
              </div>
            </div>

            {/* Field Al-Quran */}
            {tipe === 'AL_QURAN' && (
              <div className="space-y-4 p-4 rounded-2xl bg-violet-50/60 border border-violet-100">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Surah</label>
                  <SurahCombobox value={surah} onChange={setSurah} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Ayat Mulai</label>
                    <Input
                      type="number" min={1} placeholder="1"
                      value={ayatMulai} onChange={(e) => setAyatMulai(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Ayat Selesai</label>
                    <Input
                      type="number" min={1} placeholder="10"
                      value={ayatSelesai} onChange={(e) => setAyatSelesai(e.target.value)}
                    />
                  </div>
                </div>

                {/* Kategori */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Kategori <span className="text-slate-400 font-normal">(opsional)</span></label>
                  <div className="flex gap-2">
                    {(['', 'ZIYADAH', 'MUROJAAH'] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKategori(k)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          kategori === k
                            ? 'border-violet-400 bg-violet-100 text-violet-700'
                            : 'border-slate-200 text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {k === '' ? '— Tidak' : k === 'ZIYADAH' ? 'Ziyadah' : 'Murojaah'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nilai */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Nilai <span className="text-slate-400 font-normal">(opsional)</span></label>
                  <div className="flex gap-2">
                    {['', 'Lancar', 'Perlu Pengulangan', 'Baik'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setNilaiAQ(v)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          nilaiAQ === v
                            ? 'border-violet-400 bg-violet-100 text-violet-700'
                            : 'border-slate-200 text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {v === '' ? '— Tanpa' : v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Field Pra-Tahsin */}
            {tipe === 'PRA_TAHSIN' && (
              <div className="space-y-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Kitab</label>
                  <select
                    value={kitabId}
                    onChange={(e) => setKitabId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">— Pilih kitab —</option>
                    {kitabList.map((k) => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Halaman Mulai</label>
                    <Input
                      type="number" min={1} placeholder="1"
                      value={halamanMulai} onChange={(e) => setHalamanMulai(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Halaman Selesai</label>
                    <Input
                      type="number" min={1} placeholder="10"
                      value={halamanSelesai} onChange={(e) => setHalamanSelesai(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Nilai <span className="text-slate-400 font-normal">(opsional)</span></label>
                  <div className="flex gap-2">
                    {['', 'Lancar', 'Perlu Pengulangan'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setNilaiPT(v)}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                          nilaiPT === v
                            ? 'border-amber-400 bg-amber-100 text-amber-700'
                            : 'border-slate-200 text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {v === '' ? '— Tanpa' : v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting}
              className={`w-full h-12 rounded-2xl text-base font-bold ${
                isOnline
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {submitting
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : isOnline
                  ? <><CheckCircle className="w-4 h-4 mr-2" /> Simpan Setoran</>
                  : <><WifiOff className="w-4 h-4 mr-2" /> Simpan (Offline)</>
              }
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Success card + tombol WA ──────────────────────────────────── */}
      {lastSaved && (
        <Card className="rounded-3xl border-0 shadow-sm bg-emerald-50 border-emerald-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-800">Setoran berhasil disimpan!</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {lastSaved.santri.nama} ·{' '}
                  {lastSaved.item.tipe === 'AL_QURAN'
                    ? `${lastSaved.item.surah} ${lastSaved.item.ayatMulai}–${lastSaved.item.ayatSelesai}`
                    : `${lastSaved.item.kitab?.nama} hal. ${lastSaved.item.halamanMulai}–${lastSaved.item.halamanSelesai}`
                  }
                  {lastSaved.item.nilai ? ` · ${lastSaved.item.nilai}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLastSaved(null)}
                className="text-emerald-400 hover:text-emerald-600 text-lg leading-none"
                aria-label="Tutup"
              >×</button>
            </div>

            {lastSaved.santri.noWaWali ? (
              <div className="mt-3 pt-3 border-t border-emerald-200">
                <WhatsAppButton
                  setoran={{
                    tanggal:        lastSaved.item.tanggal,
                    tipe:           lastSaved.item.tipe,
                    surah:          lastSaved.item.surah,
                    ayatMulai:      lastSaved.item.ayatMulai,
                    ayatSelesai:    lastSaved.item.ayatSelesai,
                    kategori:       lastSaved.item.kategori,
                    kitabNama:      lastSaved.item.kitab?.nama,
                    halamanMulai:   lastSaved.item.halamanMulai,
                    halamanSelesai: lastSaved.item.halamanSelesai,
                    nilai:          lastSaved.item.nilai,
                  }}
                  santri={{
                    nama:      lastSaved.santri.nama,
                    nis:       lastSaved.santri.nis,
                    noWaWali:  lastSaved.santri.noWaWali,
                  }}
                  className="w-full justify-center"
                />
              </div>
            ) : (
              <p className="text-xs text-emerald-500 mt-2 italic">
                Nomor WA wali belum terdaftar untuk santri ini.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ringkasan setoran terbaru */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            5 Setoran Terakhir
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-5">
          {loadingRecent ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
            </div>
          ) : recentSetoran.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Belum ada setoran hari ini.</p>
          ) : (
            <div className="space-y-2">
              {recentSetoran.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${
                    s.tipe === 'AL_QURAN' ? 'bg-violet-400' : 'bg-amber-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{s.santri.nama}</p>
                    <p className="text-xs text-slate-400">{SetoranLabel(s)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {s.nilai && (
                      <Badge variant="secondary" className="text-xs rounded-full">
                        {s.nilai}
                      </Badge>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(s.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
