'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Input }  from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2, FileSpreadsheet, FileText, BookMarked, GraduationCap, School, MessageSquare, CalendarCheck } from 'lucide-react'

type ExportType   = 'santri' | 'setoran' | 'absensi' | 'catatan'
type ExportFormat = 'csv' | 'xlsx'

interface KelasOption { id: string; nama: string }

const TYPE_CONFIG: {
  value:    ExportType
  label:    string
  icon:     React.ElementType
  color:    string
  filters:  ('kelas' | 'tipe' | 'dateRange' | 'status')[]
}[] = [
  { value: 'santri',  label: 'Data Santri',  icon: GraduationCap, color: 'border-blue-200   bg-blue-50   text-blue-700',   filters: ['kelas', 'status'] },
  { value: 'setoran', label: 'Setoran',      icon: BookMarked,    color: 'border-violet-200 bg-violet-50 text-violet-700', filters: ['kelas', 'tipe', 'dateRange'] },
  { value: 'absensi', label: 'Absensi',      icon: CalendarCheck, color: 'border-emerald-200 bg-emerald-50 text-emerald-700', filters: ['kelas', 'dateRange'] },
  { value: 'catatan', label: 'Catatan',      icon: MessageSquare, color: 'border-amber-200  bg-amber-50  text-amber-700',  filters: ['kelas', 'dateRange'] },
]

export default function AdminExportPage() {
  const [selectedType,   setSelectedType]   = useState<ExportType>('santri')
  const [format,         setFormat]         = useState<ExportFormat>('xlsx')
  const [loading,        setLoading]        = useState(false)
  const [kelasList,      setKelasList]      = useState<KelasOption[]>([])

  // Filters
  const [kelasId,    setKelasId]    = useState('')
  const [tipe,       setTipe]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate,  setStartDate]  = useState('')
  const [endDate,    setEndDate]    = useState('')

  useEffect(() => {
    fetch('/api/admin/kelas')
      .then((r) => r.json())
      .then((data) => setKelasList(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const activeConfig = TYPE_CONFIG.find((t) => t.value === selectedType)!

  async function handleExport() {
    setLoading(true)
    try {
      const sp = new URLSearchParams({ type: selectedType, format })
      if (kelasId)      sp.set('kelasId',   kelasId)
      if (tipe)         sp.set('tipe',      tipe)
      if (statusFilter) sp.set('status',    statusFilter)
      if (startDate)    sp.set('startDate', startDate)
      if (endDate)      sp.set('endDate',   endDate)

      const res = await fetch(`/api/admin/export?${sp}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error((data as { error?: string }).error ?? 'Gagal mengekspor data.')
        return
      }

      // Ambil nama file dari header atau buat default
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match       = disposition.match(/filename="?([^"]+)"?/)
      const filename    = match?.[1] ?? `smstpq_${selectedType}.${format}`

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`File "${filename}" berhasil diunduh.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
          <FileDown className="w-5 h-5 text-blue-500" /> Ekspor Data
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Unduh data ke format CSV atau Excel (.xlsx)</p>
      </div>

      {/* Pilih tipe data */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-sm text-slate-500">1. Pilih Jenis Data</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TYPE_CONFIG.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedType(value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  selectedType === value
                    ? color
                    : 'border-slate-200 hover:border-slate-300 text-slate-500'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-sm text-slate-500">2. Filter Data (Opsional)</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-4">
          {activeConfig.filters.includes('kelas') && (
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5" /> Kelas
              </label>
              <select
                value={kelasId}
                onChange={(e) => setKelasId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Semua Kelas</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </div>
          )}

          {activeConfig.filters.includes('tipe') && (
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Tipe Setoran</label>
              <select
                value={tipe}
                onChange={(e) => setTipe(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Semua Tipe</option>
                <option value="AL_QURAN">Al-Quran</option>
                <option value="PRA_TAHSIN">Pra-Tahsin</option>
              </select>
            </div>
          )}

          {activeConfig.filters.includes('status') && (
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Status Santri</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Semua Status</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
            </div>
          )}

          {activeConfig.filters.includes('dateRange') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Tanggal Mulai</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Tanggal Akhir</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pilih format & tombol ekspor */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-sm text-slate-500">3. Pilih Format & Unduh</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormat('xlsx')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 text-sm font-semibold transition-all ${
                format === 'xlsx'
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel (.xlsx)
              <span className="text-xs font-normal opacity-60">untuk analisis</span>
            </button>
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 text-sm font-semibold transition-all ${
                format === 'csv'
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              CSV
              <span className="text-xs font-normal opacity-60">universal</span>
            </button>
          </div>

          <Button
            onClick={handleExport}
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white text-base font-bold gap-2"
          >
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Mengekspor…</>
              : <><FileDown className="w-5 h-5" /> Ekspor {activeConfig.label} sebagai .{format.toUpperCase()}</>
            }
          </Button>

          <p className="text-xs text-slate-400 text-center">
            CSV menggunakan BOM UTF-8 agar tampil benar di Microsoft Excel.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
