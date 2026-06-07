'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  Card, CardContent,
} from '@/components/ui/card'
import { Input }  from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge }  from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  GraduationCap, Plus, Pencil, Loader2, Search,
  UserCheck, ChevronLeft, ChevronRight, ArrowRightLeft,
} from 'lucide-react'
import {
  STATUS_SANTRI_LABEL,
  STATUS_SANTRI_BADGE,
  type StatusSantri,
} from '@/lib/santri-status'

// ── Types ──────────────────────────────────────────────────────────────────────
interface SantriItem {
  id:                 string
  nis:                string
  nama:               string
  isActive:           boolean
  status:             StatusSantri
  statusSejak:        string | null
  statusCatatan:      string | null
  targetPembelajaran: string | null
  deadlineTarget:     string | null
  noWaWali:           string | null
  createdAt:          string
  kelas:              { id: string; nama: string } | null
  _count:             { setoran: number }
}

interface KelasOption { id: string; nama: string }

// ── Form santri (tambah / edit) ───────────────────────────────────────────────
function SantriFormDialog({
  open,
  initial,
  kelasList,
  onClose,
  onSaved,
}: {
  open:      boolean
  initial:   SantriItem | null
  kelasList: KelasOption[]
  onClose:   () => void
  onSaved:   (s: SantriItem) => void
}) {
  const [nama,    setNama]    = useState('')
  const [kelasId, setKelasId] = useState('')
  const [target,  setTarget]  = useState('')
  const [deadline,setDeadline]= useState('')
  const [noWa,    setNoWa]    = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initial) {
      setNama(initial.nama)
      setKelasId(initial.kelas?.id ?? '')
      setTarget(initial.targetPembelajaran ?? '')
      setDeadline(initial.deadlineTarget ? initial.deadlineTarget.slice(0, 10) : '')
      setNoWa(initial.noWaWali ?? '')
    } else {
      setNama(''); setKelasId(''); setTarget(''); setDeadline(''); setNoWa('')
    }
  }, [initial, open])

  async function handleSave() {
    if (!nama.trim()) { toast.error('Nama santri wajib diisi.'); return }
    setLoading(true)
    try {
      const url    = initial ? `/api/admin/santri/${initial.id}` : '/api/admin/santri'
      const method = initial ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nama:               nama.trim(),
          kelasId:            kelasId || null,
          targetPembelajaran: target.trim()  || null,
          deadlineTarget:     deadline || null,
          noWaWali:           noWa.trim()    || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Gagal menyimpan.'); return }
      toast.success(initial ? 'Data santri diperbarui.' : `Santri ditambahkan. NIS: ${(data as SantriItem).nis}`)
      onSaved(data as SantriItem)
      onClose()
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Santri' : 'Tambah Santri'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {initial && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50">
              <span className="text-xs text-slate-400">NIS (tidak dapat diubah):</span>
              <span className="font-mono font-bold text-slate-700">{initial.nis}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Nama Lengkap <span className="text-rose-500">*</span></label>
            <Input placeholder="Nama santri" value={nama} onChange={(e) => setNama(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Kelas</label>
            <select
              value={kelasId}
              onChange={(e) => setKelasId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">— Tanpa Kelas —</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Target Pembelajaran</label>
            <Input
              placeholder="Misal: Menghafal Juz 30"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Deadline Target</label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">No. WA Wali</label>
              <Input
                placeholder="08123456789"
                value={noWa}
                onChange={(e) => setNoWa(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-2xl">Batal</Button>
          <Button onClick={handleSave} disabled={loading} className="rounded-2xl bg-blue-500 hover:bg-blue-600 text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Dialog ubah status santri ─────────────────────────────────────────────────
function StatusChangeDialog({
  open,
  santri,
  onClose,
  onSaved,
}: {
  open:    boolean
  santri:  SantriItem | null
  onClose: () => void
  onSaved: (s: SantriItem) => void
}) {
  const [status,   setStatus]   = useState<StatusSantri>('AKTIF')
  const [sejak,    setSejak]    = useState('')
  const [catatan,  setCatatan]  = useState('')
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (santri) {
      setStatus(santri.status)
      setSejak(santri.statusSejak ? santri.statusSejak.slice(0, 10) : new Date().toISOString().slice(0, 10))
      setCatatan(santri.statusCatatan ?? '')
    }
  }, [santri, open])

  async function handleSave() {
    if (!santri) return
    if (status !== 'AKTIF' && !sejak) {
      toast.error('Tanggal status wajib diisi.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/santri/${santri.id}`, {
        method:      'PATCH',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status,
          statusSejak:   status === 'AKTIF' ? null : sejak,
          statusCatatan: catatan.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Gagal menyimpan.'); return }
      toast.success(`Status diubah menjadi ${STATUS_SANTRI_LABEL[status]}.`)
      onSaved(data as SantriItem)
      onClose()
    } finally { setLoading(false) }
  }

  if (!santri) return null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle>Ubah Status Santri</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="p-3 rounded-2xl bg-slate-50">
            <p className="font-semibold text-slate-700">{santri.nama}</p>
            <p className="text-xs text-slate-400 font-mono">{santri.nis}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusSantri)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {(Object.keys(STATUS_SANTRI_LABEL) as StatusSantri[]).map((s) => (
                <option key={s} value={s}>{STATUS_SANTRI_LABEL[s]}</option>
              ))}
            </select>
          </div>

          {status !== 'AKTIF' && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">
                  Tanggal {STATUS_SANTRI_LABEL[status]} <span className="text-rose-500">*</span>
                </label>
                <Input type="date" value={sejak} onChange={(e) => setSejak(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Keterangan</label>
                <Input
                  placeholder="Misal: Pindah ke TPQ Al-Ikhlas"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                />
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
                Santri dengan status {STATUS_SANTRI_LABEL[status].toLowerCase()} akan dikeluarkan dari kelas
                dan tidak muncul di daftar setoran pengajar.
              </p>
            </>
          )}

          {status === 'AKTIF' && santri.status !== 'AKTIF' && (
            <p className="text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">
              Santri akan diaktifkan kembali dan dapat ditugaskan ke kelas.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-2xl">Batal</Button>
          <Button onClick={handleSave} disabled={loading} className="rounded-2xl bg-blue-500 hover:bg-blue-600 text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Halaman ───────────────────────────────────────────────────────────────────
export default function AdminSantriPage() {
  const [santriList, setSantriList] = useState<SantriItem[]>([])
  const [kelasList,  setKelasList]  = useState<KelasOption[]>([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [formOpen,   setFormOpen]   = useState(false)
  const [editItem,   setEditItem]   = useState<SantriItem | null>(null)
  const [statusItem, setStatusItem] = useState<SantriItem | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)

  // Filters
  const [q,         setQ]         = useState('')
  const [filterKelas,setFilterKelas] = useState('')
  const [filterStatus,setFilterStatus] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const PAGE_SIZE = 20

  const fetchSantri = useCallback(async (
    qVal = q, kVal = filterKelas, sVal = filterStatus, pg = page,
  ) => {
    setLoading(true)
    try {
      const sp = new URLSearchParams({ page: String(pg) })
      if (qVal)  sp.set('q', qVal)
      if (kVal)  sp.set('kelasId', kVal)
      if (sVal)  sp.set('status', sVal)
      const res  = await fetch(`/api/admin/santri?${sp}`, { credentials: 'include' })
      const data = await res.json()
      setSantriList(data.data ?? [])
      setTotal(data.total  ?? 0)
    } finally { setLoading(false) }
  }, [q, filterKelas, filterStatus, page])

  useEffect(() => {
    fetch('/api/admin/kelas', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setKelasList(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => { fetchSantri() }, [fetchSantri])

  function handleSearchChange(val: string) {
    setQ(val); setPage(1)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchSantri(val, filterKelas, filterStatus, 1), 350)
  }

  function handleFilterChange(kelas: string, status: string) {
    setFilterKelas(kelas); setFilterStatus(status); setPage(1)
    fetchSantri(q, kelas, status, 1)
  }

  function handleStatusSaved(updated: SantriItem) {
    setSantriList((prev) => prev.map((x) => x.id === updated.id ? { ...x, ...updated } : x))
  }

  function handleSaved(updated: SantriItem) {
    setSantriList((prev) => {
      const idx = prev.findIndex((x) => x.id === updated.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...updated }; return next }
      return [updated, ...prev]
    })
    setTotal((t) => t + 1)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-500" /> Manajemen Santri
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{total} santri ditemukan</p>
        </div>
        <Button
          onClick={() => { setEditItem(null); setFormOpen(true) }}
          className="rounded-2xl bg-blue-500 hover:bg-blue-600 text-white gap-2"
        >
          <Plus className="w-4 h-4" /> Tambah Santri
        </Button>
      </div>

      {/* Filter bar */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cari nama atau NIS…"
              value={q}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={filterKelas}
            onChange={(e) => handleFilterChange(e.target.value, filterStatus)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Semua Kelas</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => handleFilterChange(filterKelas, e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="lulus">Lulus</option>
            <option value="pindah">Pindah</option>
            <option value="keluar">Keluar</option>
            <option value="nonaktif">Bukan Aktif</option>
          </select>
        </CardContent>
      </Card>

      {/* Tabel */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
          ) : santriList.length === 0 ? (
            <div className="text-center py-16">
              <GraduationCap className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">Tidak ada santri ditemukan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NIS</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead className="text-center">Setoran</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {santriList.map((s) => (
                  <TableRow key={s.id} className={s.status !== 'AKTIF' ? 'opacity-60' : undefined}>
                    <TableCell className="font-mono text-xs text-slate-500">{s.nis}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">{s.nama}</p>
                        {s.targetPembelajaran && (
                          <p className="text-xs text-slate-400 truncate max-w-[160px]">{s.targetPembelajaran}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.kelas
                        ? <Badge variant="secondary" className="rounded-full text-xs">{s.kelas.nama}</Badge>
                        : <span className="text-xs text-slate-400 italic">Tanpa kelas</span>
                      }
                    </TableCell>
                    <TableCell className="text-center text-sm text-slate-500">{s._count.setoran}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={`rounded-full text-xs ${STATUS_SANTRI_BADGE[s.status] ?? 'bg-slate-100 text-slate-500'}`}
                      >
                        {STATUS_SANTRI_LABEL[s.status] ?? s.status}
                      </Badge>
                      {s.statusSejak && s.status !== 'AKTIF' && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(s.statusSejak).toLocaleDateString('id-ID')}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl h-8 px-3 text-slate-500 hover:text-blue-600"
                          onClick={() => { setEditItem(s); setFormOpen(true) }}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setStatusItem(s); setStatusOpen(true) }}
                          className="rounded-xl h-8 px-3 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                        >
                          {s.status === 'AKTIF'
                            ? <><ArrowRightLeft className="w-3.5 h-3.5 mr-1" />Status</>
                            : <><UserCheck className="w-3.5 h-3.5 mr-1" />Status</>
                          }
                        </Button>
                      </div>
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
          <span>Halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page <= 1}
              onClick={() => { setPage(page - 1); fetchSantri(q, filterKelas, filterStatus, page - 1) }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page >= totalPages}
              onClick={() => { setPage(page + 1); fetchSantri(q, filterKelas, filterStatus, page + 1) }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <StatusChangeDialog
        open={statusOpen}
        santri={statusItem}
        onClose={() => setStatusOpen(false)}
        onSaved={handleStatusSaved}
      />

      <SantriFormDialog
        open={formOpen}
        initial={editItem}
        kelasList={kelasList}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
