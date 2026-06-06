'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button }  from '@/components/ui/button'
import {
  MessageSquare, Loader2, WifiOff, Wifi,
  RefreshCw, Send, Clock,
} from 'lucide-react'
import SantriCombobox, { type SantriOption } from '@/components/SantriCombobox'

// ── Types ──────────────────────────────────────────────────────────────────────
interface CatatanItem {
  id:        string
  isi:       string
  createdAt: string
  santri:    { nama: string; nis: string }
  pengajar:  { nama: string }
}

interface QueuedCatatan {
  id:       string
  santriId: string
  santriNama: string
  isi:      string
  savedAt:  number
}

const QUEUE_KEY = 'smstpq_catatanQueue'

function loadQueue(): QueuedCatatan[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') } catch { return [] }
}
function saveQueue(q: QueuedCatatan[]) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)) }

// ── Page ───────────────────────────────────────────────────────────────────────
export default function CatatanPage() {
  const [isOnline,  setIsOnline]  = useState(true)
  const [santri,    setSantri]    = useState<SantriOption | null>(null)
  const [isi,       setIsi]       = useState('')
  const [submitting,setSubmitting]= useState(false)
  const [queue,     setQueue]     = useState<QueuedCatatan[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [catatan,   setCatatan]   = useState<CatatanItem[]>([])
  const [loadingList,setLoadingList] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    setQueue(loadQueue())

    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Auto-sync saat online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isSyncing) syncQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  const fetchCatatan = useCallback(async () => {
    setLoadingList(true)
    try {
      const res  = await fetch('/api/catatan?limit=10')
      const data = await res.json()
      setCatatan(Array.isArray(data) ? data : [])
    } finally { setLoadingList(false) }
  }, [])

  useEffect(() => { fetchCatatan() }, [fetchCatatan])

  async function syncQueue() {
    const current = loadQueue()
    if (current.length === 0) return
    setIsSyncing(true)

    let remaining = [...current]
    for (const item of current) {
      try {
        const res = await fetch('/api/catatan', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ santriId: item.santriId, isi: item.isi }),
        })
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          remaining = remaining.filter((r) => r.id !== item.id)
        }
      } catch { /* network error — coba lagi berikutnya */ }
    }

    saveQueue(remaining)
    setQueue(remaining)
    setIsSyncing(false)
    if (remaining.length < current.length) {
      toast.success(`${current.length - remaining.length} catatan tersinkron!`)
      fetchCatatan()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!santri)         { toast.error('Pilih santri terlebih dahulu.'); return }
    if (!isi.trim())     { toast.error('Isi catatan tidak boleh kosong.'); return }
    if (isi.length > 2000) { toast.error('Catatan terlalu panjang (maks 2000 karakter).'); return }

    setSubmitting(true)
    try {
      if (!navigator.onLine) {
        // Simpan ke antrian offline
        const item: QueuedCatatan = {
          id:         crypto.randomUUID(),
          santriId:   santri.id,
          santriNama: santri.nama,
          isi:        isi.trim(),
          savedAt:    Date.now(),
        }
        const updated = [...loadQueue(), item]
        saveQueue(updated)
        setQueue(updated)
        toast.info(`Catatan tersimpan offline. ${updated.length} item menunggu sync.`)
        setIsi(''); setSantri(null)
        return
      }

      const res  = await fetch('/api/catatan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ santriId: santri.id, isi: isi.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Gagal menyimpan catatan.')
        return
      }

      toast.success('Catatan berhasil disimpan!')
      setIsi(''); setSantri(null)
      fetchCatatan()
    } finally {
      setSubmitting(false)
    }
  }

  const charLeft = 2000 - isi.length

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Catatan Perkembangan</h1>
          <p className="text-slate-500 text-sm mt-0.5">Catat perkembangan atau observasi untuk santri</p>
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

      {/* Form */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-0 pt-5 px-6">
          <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Tambah Catatan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Santri</label>
              <SantriCombobox value={santri} onChange={setSantri} />
              {santri && (
                <p className="text-xs text-blue-600 font-medium">
                  NIS {santri.nis} · {santri.kelas?.nama ?? 'Tanpa kelas'}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-sm font-semibold text-slate-700">Catatan</label>
                <span className={`text-xs ${charLeft < 100 ? 'text-rose-500' : 'text-slate-400'}`}>
                  {charLeft} karakter tersisa
                </span>
              </div>
              <textarea
                value={isi}
                onChange={(e) => setIsi(e.target.value)}
                placeholder="Tulis observasi, perkembangan hafalan, atau catatan penting lainnya…"
                rows={5}
                maxLength={2000}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className={`w-full h-11 rounded-2xl font-bold ${
                isOnline
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {submitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isOnline
                  ? <><Send className="w-4 h-4 mr-2" /> Simpan Catatan</>
                  : <><WifiOff className="w-4 h-4 mr-2" /> Simpan (Offline)</>
              }
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Antrian offline */}
      {queue.length > 0 && (
        <Card className="rounded-3xl border-0 shadow-sm border-amber-200 bg-amber-50">
          <CardHeader className="pb-0 pt-4 px-5">
            <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Antrian Offline ({queue.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-3 space-y-2">
            {queue.map((q) => (
              <div key={q.id} className="bg-white rounded-2xl p-3 text-sm">
                <p className="font-semibold text-slate-700">{q.santriNama}</p>
                <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{q.isi}</p>
                <p className="text-amber-500 text-[10px] mt-1">
                  {new Date(q.savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Daftar catatan terbaru */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Catatan Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-5">
          {loadingList ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
            </div>
          ) : catatan.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada catatan.</p>
          ) : (
            <div className="space-y-3">
              {catatan.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-slate-50">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-bold text-slate-700">{c.santri.nama}</p>
                      <p className="text-xs text-slate-400">{c.santri.nis}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(c.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{c.isi}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
