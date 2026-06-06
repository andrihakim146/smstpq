'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input }  from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  CalendarCheck, Loader2, WifiOff, Wifi,
  RefreshCw, CheckCircle, Users, Clock,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
type Status = 'HADIR' | 'TIDAK_HADIR' | 'IZIN' | 'SAKIT'

interface KelasItem { id: string; nama: string; _count: { santri: number } }
interface SantriItem { id: string; nis: string; nama: string }
interface AbsensiEntry { santriId: string; status: Status; keterangan: string }

interface QueuedAbsensi {
  id:        string
  tanggal:   string
  kelasNama: string
  items:     AbsensiEntry[]
  savedAt:   number
}

const STATUS_CONFIG: { value: Status; label: string; color: string }[] = [
  { value: 'HADIR',       label: 'Hadir',          color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'IZIN',        label: 'Izin',            color: 'bg-blue-100    text-blue-700    border-blue-300'    },
  { value: 'SAKIT',       label: 'Sakit',           color: 'bg-amber-100   text-amber-700   border-amber-300'   },
  { value: 'TIDAK_HADIR', label: 'Alpa',            color: 'bg-rose-100    text-rose-700    border-rose-300'    },
]

const QUEUE_KEY = 'smstpq_absensiQueue'

function loadQueue(): QueuedAbsensi[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') } catch { return [] }
}
function saveQueue(q: QueuedAbsensi[]) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)) }

// ── Komponen status toggle per santri ─────────────────────────────────────────
function StatusToggle({
  value,
  onChange,
}: {
  value:    Status
  onChange: (s: Status) => void
}) {
  return (
    <div className="flex gap-1.5">
      {STATUS_CONFIG.map(({ value: v, label, color }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
            value === v
              ? color
              : 'border-slate-200 text-slate-400 hover:border-slate-300'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AbsensiPage() {
  const [isOnline,    setIsOnline]    = useState(true)
  const [isSyncing,   setIsSyncing]   = useState(false)
  const [queue,       setQueue]       = useState<QueuedAbsensi[]>([])

  const [tanggal,     setTanggal]     = useState(() => new Date().toISOString().split('T')[0])
  const [kelasList,   setKelasList]   = useState<KelasItem[]>([])
  const [kelasId,     setKelasId]     = useState('')
  const [santriList,  setSantriList]  = useState<SantriItem[]>([])
  const [loadingSantri, setLoadingSantri] = useState(false)
  const [absensiMap,  setAbsensiMap]  = useState<Record<string, AbsensiEntry>>({})
  const [submitting,  setSubmitting]  = useState(false)

  // Inisialisasi
  useEffect(() => {
    setIsOnline(navigator.onLine)
    setQueue(loadQueue())

    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)

    fetch('/api/kelas')
      .then((r) => r.json())
      .then((data) => setKelasList(Array.isArray(data) ? data : []))
      .catch(() => {})

    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  // Auto-sync saat kembali online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isSyncing) syncQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  // Fetch santri saat kelas atau tanggal berubah
  useEffect(() => {
    if (!kelasId) { setSantriList([]); setAbsensiMap({}); return }

    setLoadingSantri(true)
    fetch(`/api/santri?kelasId=${kelasId}`)
      .then((r) => r.json())
      .then((data: SantriItem[]) => {
        setSantriList(Array.isArray(data) ? data : [])
        // Default semua: HADIR
        const initial: Record<string, AbsensiEntry> = {}
        ;(Array.isArray(data) ? data : []).forEach((s) => {
          initial[s.id] = { santriId: s.id, status: 'HADIR', keterangan: '' }
        })
        setAbsensiMap(initial)
      })
      .catch(() => setSantriList([]))
      .finally(() => setLoadingSantri(false))
  }, [kelasId])

  function updateStatus(santriId: string, status: Status) {
    setAbsensiMap((prev) => ({ ...prev, [santriId]: { ...prev[santriId], status } }))
  }

  function updateKeterangan(santriId: string, keterangan: string) {
    setAbsensiMap((prev) => ({ ...prev, [santriId]: { ...prev[santriId], keterangan } }))
  }

  const syncQueue = useCallback(async () => {
    const current = loadQueue()
    if (current.length === 0) return
    setIsSyncing(true)

    let remaining = [...current]
    for (const batch of current) {
      try {
        const res = await fetch('/api/absensi/batch', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ items: batch.items }),
        })
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          remaining = remaining.filter((r) => r.id !== batch.id)
        }
      } catch { /* network error */ }
    }

    saveQueue(remaining)
    setQueue(remaining)
    setIsSyncing(false)

    if (remaining.length < current.length) {
      toast.success(`${current.length - remaining.length} batch absensi tersinkron!`)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!kelasId) { toast.error('Pilih kelas terlebih dahulu.'); return }
    if (santriList.length === 0) { toast.error('Tidak ada santri di kelas ini.'); return }

    const kelasObj  = kelasList.find((k) => k.id === kelasId)
    const items     = santriList.map((s) => absensiMap[s.id]).filter(Boolean)

    setSubmitting(true)
    try {
      if (!navigator.onLine) {
        const batch: QueuedAbsensi = {
          id:        crypto.randomUUID(),
          tanggal,
          kelasNama: kelasObj?.nama ?? '—',
          items:     items.map((i) => ({
            ...i,
            tanggal, // ditambahkan saat sync
          })),
          savedAt: Date.now(),
        }
        // Simpan dengan tanggal di dalam setiap item
        const batchWithDate: QueuedAbsensi = {
          ...batch,
          items: items.map((i) => ({ santriId: i.santriId, status: i.status, keterangan: i.keterangan })),
        }
        // Kita perlu menyimpan tanggal di items agar batch sync bisa pakai
        const fullItems = items.map((i) => ({ ...i, tanggal }))
        const queueBatch: QueuedAbsensi = { ...batchWithDate, items: fullItems as AbsensiEntry[] }
        const updated = [...loadQueue(), queueBatch]
        saveQueue(updated)
        setQueue(updated)
        toast.info(`Absensi tersimpan offline. ${updated.length} batch menunggu sync.`)
        return
      }

      const payload = { items: items.map((i) => ({ ...i, tanggal })) }
      const res  = await fetch('/api/absensi/batch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Gagal menyimpan absensi.')
        return
      }

      if (data.failed > 0) {
        toast.warning(`${data.success} berhasil, ${data.failed} gagal.`)
      } else {
        toast.success(`Absensi ${kelasObj?.nama ?? ''} berhasil disimpan!`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Hitung ringkasan cepat dari absensiMap
  const summary = { HADIR: 0, IZIN: 0, SAKIT: 0, TIDAK_HADIR: 0 }
  Object.values(absensiMap).forEach((e) => { summary[e.status]++ })
  const hadirCount = Object.values(absensiMap).filter((e) => e.status === 'HADIR').length

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Absensi Harian</h1>
          <p className="text-slate-500 text-sm mt-0.5">Catat kehadiran santri per kelas</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 ${
            isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>

          {queue.length > 0 && (
            <button
              onClick={syncQueue}
              disabled={!isOnline || isSyncing}
              className="flex items-center gap-1.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full px-3 py-1.5 hover:bg-amber-200 disabled:opacity-50 transition-colors"
            >
              {isSyncing
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />
              }
              {queue.length} pending
            </button>
          )}
        </div>
      </div>

      {/* Filter kelas & tanggal */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-0 pt-5 px-6">
          <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4" /> Pilih Kelas & Tanggal
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Tanggal</label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Kelas</label>
              <select
                value={kelasId}
                onChange={(e) => setKelasId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">— Pilih kelas —</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama} ({k._count.santri} santri)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daftar santri */}
      {kelasId && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader className="pb-2 pt-5 px-6">
              <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Daftar Santri
                {santriList.length > 0 && (
                  <span className="ml-auto text-xs font-normal text-slate-400">
                    Hadir: <strong className="text-emerald-600">{hadirCount}</strong>/{santriList.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-3">
              {loadingSantri ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                </div>
              ) : santriList.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  Tidak ada santri di kelas ini.
                </p>
              ) : (
                <div className="space-y-2">
                  {santriList.map((s, idx) => {
                    const entry  = absensiMap[s.id]
                    const status = entry?.status ?? 'HADIR'

                    return (
                      <div
                        key={s.id}
                        className={`flex flex-col gap-2 p-3 rounded-2xl transition-colors ${
                          status === 'HADIR'       ? 'bg-emerald-50'
                          : status === 'IZIN'      ? 'bg-blue-50'
                          : status === 'SAKIT'     ? 'bg-amber-50'
                          : 'bg-rose-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs text-slate-400 font-mono shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700 truncate">{s.nama}</p>
                            <p className="text-xs text-slate-400">{s.nis}</p>
                          </div>
                        </div>

                        <StatusToggle
                          value={status}
                          onChange={(st) => updateStatus(s.id, st)}
                        />

                        {(status === 'IZIN' || status === 'SAKIT') && (
                          <Input
                            placeholder="Keterangan (opsional)…"
                            value={entry?.keterangan ?? ''}
                            onChange={(e) => updateKeterangan(s.id, e.target.value)}
                            className="text-xs h-8 rounded-xl bg-white"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ringkasan singkat */}
          {santriList.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {STATUS_CONFIG.map(({ value, label, color }) => (
                <div key={value} className={`text-center py-2.5 rounded-2xl border ${color}`}>
                  <p className="text-lg font-extrabold">{summary[value]}</p>
                  <p className="text-xs font-medium">{label}</p>
                </div>
              ))}
            </div>
          )}

          {santriList.length > 0 && (
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
                  ? <><CheckCircle className="w-4 h-4 mr-2" />Simpan Semua Absensi</>
                  : <><WifiOff className="w-4 h-4 mr-2" />Simpan (Offline)</>
              }
            </Button>
          )}
        </form>
      )}

      {/* Antrian offline */}
      {queue.length > 0 && (
        <Card className="rounded-3xl border-0 shadow-sm bg-amber-50">
          <CardHeader className="pb-0 pt-4 px-5">
            <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Antrian Offline ({queue.length} batch)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-3 space-y-2">
            {queue.map((q) => (
              <div key={q.id} className="bg-white rounded-2xl p-3 text-sm">
                <div className="flex justify-between">
                  <p className="font-semibold text-slate-700">{q.kelasNama}</p>
                  <span className="text-amber-500 text-[10px]">
                    {new Date(q.savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {q.tanggal} · {q.items.length} santri
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
