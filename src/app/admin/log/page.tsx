'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card, CardContent,
} from '@/components/ui/card'
import { Input }  from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge }  from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  ClipboardList, Loader2, ChevronLeft, ChevronRight,
  RefreshCw, ShieldAlert,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface LogItem {
  id:        string
  aksi:      string
  detail:    string
  ip:        string
  createdAt: string
  pengajar:  { nama: string } | null
}

// ── Warna badge per jenis aksi ─────────────────────────────────────────────────
const AKSI_COLOR: Record<string, string> = {
  LOGIN_BERHASIL: 'bg-emerald-100 text-emerald-700',
  LOGIN_GAGAL:    'bg-rose-100    text-rose-700',
  LOGOUT:         'bg-slate-100   text-slate-600',
  RESET_PIN:      'bg-amber-100   text-amber-700',
  NONAKTIF_AKUN:  'bg-orange-100  text-orange-700',
  AKTIF_AKUN:     'bg-blue-100    text-blue-700',
  TAMBAH_PENGAJAR:'bg-violet-100  text-violet-700',
  HAPUS_DATA:     'bg-red-100     text-red-700',
}

function aksiColor(aksi: string) {
  return AKSI_COLOR[aksi.toUpperCase()] ?? 'bg-slate-100 text-slate-500'
}

// ── Daftar aksi yang tersedia untuk filter ─────────────────────────────────────
const AKSI_OPTIONS = [
  'LOGIN_BERHASIL',
  'LOGIN_GAGAL',
  'LOGOUT',
  'RESET_PIN',
  'NONAKTIF_AKUN',
  'AKTIF_AKUN',
  'TAMBAH_PENGAJAR',
  'HAPUS_DATA',
]

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

// ── Halaman ───────────────────────────────────────────────────────────────────
export default function AdminLogPage() {
  const [logs,      setLogs]      = useState<LogItem[]>([])
  const [total,     setTotal]     = useState(0)
  const [totalPages,setTotalPages]= useState(1)
  const [page,      setPage]      = useState(1)
  const [loading,   setLoading]   = useState(true)

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate,   setEndDate]   = useState('')
  const [aksi,      setAksi]      = useState('')

  const fetchLogs = useCallback(async (
    sd = startDate, ed = endDate, ak = aksi, pg = page,
  ) => {
    setLoading(true)
    try {
      const sp = new URLSearchParams({ page: String(pg) })
      if (sd) sp.set('startDate', sd)
      if (ed) sp.set('endDate',   ed)
      if (ak) sp.set('aksi',      ak)
      const res  = await fetch(`/api/admin/log?${sp}`)
      const data = await res.json()
      setLogs(data.data        ?? [])
      setTotal(data.total      ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } finally { setLoading(false) }
  }, [startDate, endDate, aksi, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  function applyFilter() { setPage(1); fetchLogs(startDate, endDate, aksi, 1) }
  function resetFilter()  {
    setStartDate(''); setEndDate(''); setAksi(''); setPage(1)
    fetchLogs('', '', '', 1)
  }
  function goPage(pg: number) { setPage(pg); fetchLogs(startDate, endDate, aksi, pg) }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-500" /> Log Aktivitas
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{total.toLocaleString('id-ID')} entri ditemukan</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLogs()}
          className="rounded-2xl gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Filter card */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1 flex-1 min-w-36">
            <label className="text-xs font-semibold text-slate-500">Tanggal Mulai</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1 flex-1 min-w-36">
            <label className="text-xs font-semibold text-slate-500">Tanggal Akhir</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-1 flex-1 min-w-44">
            <label className="text-xs font-semibold text-slate-500">Jenis Aksi</label>
            <select
              value={aksi}
              onChange={(e) => setAksi(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Semua Aksi</option>
              {AKSI_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={applyFilter}
              className="rounded-2xl bg-blue-500 hover:bg-blue-600 text-white"
            >
              Terapkan
            </Button>
            <Button
              variant="outline"
              onClick={resetFilter}
              className="rounded-2xl"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabel log */}
      <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16">
              <ShieldAlert className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">Tidak ada log yang ditemukan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Tanggal & Waktu</TableHead>
                    <TableHead>Pengajar</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead className="whitespace-nowrap">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs text-slate-500 font-mono">
                        {fmtDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-slate-700">
                          {log.pengajar?.nama ?? (
                            <span className="italic text-slate-400">Sistem</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`rounded-full text-xs font-semibold whitespace-nowrap ${aksiColor(log.aksi)}`}
                        >
                          {log.aksi}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-slate-600 truncate" title={log.detail}>
                          {log.detail}
                        </p>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-400 whitespace-nowrap">
                        {log.ip}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
            {' '}· {total.toLocaleString('id-ID')} entri
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Nomor halaman — tampilkan max 5 di sekitar halaman aktif */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const pg    = start + i
              if (pg > totalPages) return null
              return (
                <Button
                  key={pg}
                  variant={pg === page ? 'default' : 'outline'}
                  size="sm"
                  className={`rounded-xl w-8 h-8 p-0 ${pg === page ? 'bg-blue-500 text-white' : ''}`}
                  onClick={() => goPage(pg)}
                >
                  {pg}
                </Button>
              )
            })}

            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page >= totalPages}
              onClick={() => goPage(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
