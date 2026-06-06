'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Input }  from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Archive, Loader2, Trash2, FileDown, AlertTriangle, CalendarX2, Info,
} from 'lucide-react'

type ActionType = 'download_delete' | 'delete_only'

function subtractMonths(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().split('T')[0]
}

export default function AdminRetensiPage() {
  const [before,    setBefore]    = useState(() => subtractMonths(12))
  const [months,    setMonths]    = useState(12)
  const [count,     setCount]     = useState<number | null>(null)
  const [counting,  setCounting]  = useState(false)
  const [executing, setExecuting] = useState(false)

  // Dialog konfirmasi
  const [dialogOpen,  setDialogOpen]  = useState(false)
  const [pendingAction, setPendingAction] = useState<ActionType>('delete_only')

  // Sync months → before
  function handleMonthsChange(val: string) {
    const m = Math.max(1, Math.min(120, Number(val) || 1))
    setMonths(m)
    setBefore(subtractMonths(m))
    setCount(null)
  }

  function handleBeforeChange(val: string) {
    setBefore(val)
    setCount(null)
  }

  const fetchCount = useCallback(async () => {
    if (!before) return
    setCounting(true)
    try {
      const res  = await fetch(`/api/admin/retensi/count?before=${before}`)
      const data = await res.json()
      if (res.ok) setCount(data.count)
      else toast.error(data.error ?? 'Gagal mengambil hitungan.')
    } finally { setCounting(false) }
  }, [before])

  // Auto-preview saat before berubah (debounced)
  useEffect(() => {
    if (!before) return
    const t = setTimeout(() => fetchCount(), 600)
    return () => clearTimeout(t)
  }, [before, fetchCount])

  function confirmAction(action: ActionType) {
    setPendingAction(action)
    setDialogOpen(true)
  }

  async function executeAction() {
    setDialogOpen(false)
    setExecuting(true)
    try {
      const res = await fetch('/api/admin/retensi/execute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ before, action: pendingAction }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error((data as { error?: string }).error ?? 'Operasi gagal.')
        return
      }

      if (pendingAction === 'download_delete') {
        // Download file CSV
        const disposition = res.headers.get('Content-Disposition') ?? ''
        const match       = disposition.match(/filename="?([^"]+)"?/)
        const filename    = match?.[1] ?? `smstpq_absensi_arsip_${before}.csv`

        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
        toast.success(`Arsip diunduh & ${count?.toLocaleString('id-ID') ?? '?'} record berhasil dihapus.`)
      } else {
        const data = await res.json()
        toast.success(`${(data as { deleted: number }).deleted.toLocaleString('id-ID')} record absensi berhasil dihapus.`)
      }

      setCount(0)
    } finally { setExecuting(false) }
  }

  const noData   = count === 0
  const hasCount = count !== null

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
          <Archive className="w-5 h-5 text-blue-500" /> Retensi Data Absensi
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Hapus data absensi lama untuk menjaga performa database
        </p>
      </div>

      {/* Info card */}
      <Card className="rounded-3xl border-0 shadow-sm bg-blue-50">
        <CardContent className="p-4 flex gap-3">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            Data absensi yang dihapus <strong>tidak dapat dipulihkan</strong>. Gunakan tombol
            &ldquo;Unduh & Hapus&rdquo; untuk menyimpan arsip CSV sebelum penghapusan.
            Data setoran, catatan, dan santri <em>tidak</em> terpengaruh.
          </p>
        </CardContent>
      </Card>

      {/* Konfigurasi batas usia data */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-sm text-slate-500">Konfigurasi Batas Usia Data</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Usia Maksimum (bulan)</label>
              <Input
                type="number"
                min={1}
                max={120}
                value={months}
                onChange={(e) => handleMonthsChange(e.target.value)}
              />
              <p className="text-xs text-slate-400">Default: 12 bulan</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Hapus Data Sebelum</label>
              <Input
                type="date"
                value={before}
                onChange={(e) => handleBeforeChange(e.target.value)}
              />
              <p className="text-xs text-slate-400">Semua record sebelum tanggal ini</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview hitungan */}
      <Card className={`rounded-3xl border-0 shadow-sm ${
        noData ? 'bg-slate-50' : hasCount && count! > 0 ? 'bg-amber-50' : ''
      }`}>
        <CardContent className="p-5 flex items-center gap-4">
          {counting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-slate-400 shrink-0" />
              <p className="text-sm text-slate-500">Menghitung record…</p>
            </>
          ) : !hasCount ? (
            <>
              <CalendarX2 className="w-5 h-5 text-slate-300 shrink-0" />
              <p className="text-sm text-slate-400">Pratinjau akan muncul setelah tanggal dipilih.</p>
            </>
          ) : noData ? (
            <>
              <CalendarX2 className="w-5 h-5 text-slate-300 shrink-0" />
              <p className="text-sm text-slate-500">Tidak ada record absensi sebelum <strong>{before}</strong>.</p>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">
                  {count!.toLocaleString('id-ID')} record absensi akan dihapus
                </p>
                <p className="text-xs text-amber-600">Data absensi sebelum {before}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tombol aksi */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => confirmAction('download_delete')}
          disabled={executing || !hasCount || noData}
          className="h-12 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold gap-2"
        >
          {executing && pendingAction === 'download_delete'
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <FileDown className="w-4 h-4" />
          }
          Unduh & Hapus
        </Button>
        <Button
          onClick={() => confirmAction('delete_only')}
          disabled={executing || !hasCount || noData}
          variant="outline"
          className="h-12 rounded-2xl border-rose-300 text-rose-600 hover:bg-rose-50 font-bold gap-2"
        >
          {executing && pendingAction === 'delete_only'
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Trash2 className="w-4 h-4" />
          }
          Hapus Saja
        </Button>
      </div>

      {/* Dialog konfirmasi */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) setDialogOpen(false) }}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {pendingAction === 'download_delete' ? 'Unduh & Hapus?' : 'Hapus Permanen?'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2 text-sm text-slate-600">
            <p>
              Aksi ini akan <strong className="text-rose-600">menghapus permanen</strong>{' '}
              <strong>{count?.toLocaleString('id-ID')}</strong> record absensi
              sebelum <strong>{before}</strong>.
            </p>
            {pendingAction === 'download_delete' && (
              <p className="text-blue-600">
                File arsip CSV akan diunduh secara otomatis sebelum data dihapus.
              </p>
            )}
            <p className="text-rose-500 font-medium">Tindakan ini tidak dapat dibatalkan.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-2xl">
              Batal
            </Button>
            <Button
              onClick={executeAction}
              className={`rounded-2xl text-white font-bold ${
                pendingAction === 'download_delete'
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-rose-500 hover:bg-rose-600'
              }`}
            >
              {pendingAction === 'download_delete' ? 'Ya, Unduh & Hapus' : 'Ya, Hapus Sekarang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
