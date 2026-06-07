'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { PlusIcon, KeyRoundIcon, PowerIcon, ShieldIcon, UserIcon, Loader2Icon } from 'lucide-react'

import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Badge }     from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ── Types ────────────────────────────────────────────────────────────────────
interface Pengajar {
  id:        string
  nama:      string
  peran:     'ADMIN' | 'PENGAJAR'
  isActive:  boolean
  createdAt: string
  _count:    { setoran: number; catatan: number }
}

// ── Fetch helpers ────────────────────────────────────────────────────────────
async function fetchPengajar(): Promise<Pengajar[]> {
  const res = await fetch('/api/admin/pengajar')
  if (!res.ok) throw new Error('Gagal memuat data pengajar.')
  return res.json()
}

async function apiCall(url: string, method: string, body: object) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Terjadi kesalahan.')
  return data
}

// ── Komponen utama ───────────────────────────────────────────────────────────
export default function ManajemenPengajarPage() {
  const [list, setList]         = useState<Pengajar[]>([])
  const [loading, setLoading]   = useState(true)
  const [isPending, startTx]    = useTransition()

  // Form tambah
  const [openTambah, setOpenTambah]   = useState(false)
  const [formNama, setFormNama]       = useState('')
  const [formPin, setFormPin]         = useState('')
  const [formPeran, setFormPeran]     = useState<'PENGAJAR' | 'ADMIN'>('PENGAJAR')

  // Dialog reset PIN
  const [resetTarget, setResetTarget] = useState<Pengajar | null>(null)
  const [newPin, setNewPin]           = useState('')

  // Dialog konfirmasi toggle aktif
  const [toggleTarget, setToggleTarget] = useState<Pengajar | null>(null)

  // Muat data awal
  useEffect(() => {
    fetchPengajar()
      .then(setList)
      .catch(() => toast.error('Gagal memuat data pengajar.'))
      .finally(() => setLoading(false))
  }, [])

  function reload() {
    fetchPengajar()
      .then(setList)
      .catch(() => toast.error('Gagal memperbarui data.'))
  }

  // ── Tambah pengajar ────────────────────────────────────────────────────────
  function handleTambah() {
    if (!formNama.trim() || formPin.length < 4) return
    startTx(async () => {
      try {
        await apiCall('/api/admin/pengajar', 'POST', {
          nama:  formNama.trim(),
          pin:   formPin,
          peran: formPeran,
        })
        toast.success(`Pengajar "${formNama.trim()}" berhasil ditambahkan.`)
        setOpenTambah(false)
        setFormNama('')
        setFormPin('')
        setFormPeran('PENGAJAR')
        reload()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Gagal menambahkan pengajar.')
      }
    })
  }

  // ── Reset PIN ──────────────────────────────────────────────────────────────
  function handleResetPin() {
    if (!resetTarget || newPin.length < 4) return
    startTx(async () => {
      try {
        await apiCall(`/api/admin/pengajar/${resetTarget.id}`, 'PATCH', {
          aksi: 'reset-pin',
          pin:  newPin,
        })
        toast.success(`PIN ${resetTarget.nama} berhasil direset.`)
        setResetTarget(null)
        setNewPin('')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Gagal reset PIN.')
      }
    })
  }

  // ── Toggle aktif ──────────────────────────────────────────────────────────
  function handleToggleAktif() {
    if (!toggleTarget) return
    const nextState = !toggleTarget.isActive
    startTx(async () => {
      try {
        await apiCall(`/api/admin/pengajar/${toggleTarget.id}`, 'PATCH', {
          aksi:     'toggle-aktif',
          isActive: nextState,
        })
        toast.success(
          `${toggleTarget.nama} berhasil ${nextState ? 'diaktifkan' : 'dinonaktifkan'}.`,
        )
        setToggleTarget(null)
        reload()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Gagal mengubah status.')
      }
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const aktif    = list.filter((p) => p.isActive)
  const nonaktif = list.filter((p) => !p.isActive)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Pengajar</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {aktif.length} aktif · {nonaktif.length} nonaktif
          </p>
        </div>

        {/* Tombol tambah */}
        <Dialog open={openTambah} onOpenChange={setOpenTambah}>
          <DialogTrigger render={
            <Button className="rounded-2xl bg-amber-400 hover:bg-amber-500 text-white gap-2 shadow-sm">
              <PlusIcon className="w-4 h-4" />
              Tambah Pengajar
            </Button>
          } />
          <DialogContent className="rounded-3xl max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Pengajar Baru</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nama Lengkap</label>
                <Input
                  placeholder="Contoh: Ustadz Ahmad"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">PIN Awal (4–6 digit)</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={formPin}
                  onChange={(e) => setFormPin(e.target.value.replace(/\D/g, ''))}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Peran</label>
                <Select value={formPeran} onValueChange={(v: 'PENGAJAR' | 'ADMIN' | null) => v && setFormPeran(v)}>
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENGAJAR">Pengajar</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter showCloseButton>
              <Button
                onClick={handleTambah}
                disabled={!formNama.trim() || formPin.length < 4 || isPending}
                className="rounded-2xl bg-blue-500 hover:bg-blue-600 text-white"
              >
                {isPending ? <Loader2Icon className="w-4 h-4 animate-spin" /> : 'Simpan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabel */}
      <Card className="rounded-3xl border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-700">Daftar Pengajar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2Icon className="w-5 h-5 animate-spin" />
              Memuat data...
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              Belum ada pengajar.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead className="pl-6">Nama</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead className="text-center">Setoran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => (
                  <TableRow key={p.id} className="border-slate-100 hover:bg-slate-50">
                    {/* Nama */}
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold shrink-0">
                          {p.nama.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800">{p.nama}</span>
                      </div>
                    </TableCell>

                    {/* Peran */}
                    <TableCell>
                      <Badge
                        variant={p.peran === 'ADMIN' ? 'default' : 'secondary'}
                        className={p.peran === 'ADMIN'
                          ? 'bg-blue-100 text-blue-700 rounded-full'
                          : 'bg-slate-100 text-slate-600 rounded-full'}
                      >
                        {p.peran === 'ADMIN'
                          ? <><ShieldIcon className="w-3 h-3 mr-1" />Admin</>
                          : <><UserIcon className="w-3 h-3 mr-1" />Pengajar</>}
                      </Badge>
                    </TableCell>

                    {/* Jumlah setoran */}
                    <TableCell className="text-center text-slate-500 text-sm">
                      {p._count.setoran}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={p.isActive
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 rounded-full'
                          : 'border-slate-200 bg-slate-50 text-slate-400 rounded-full'}
                      >
                        {p.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>

                    {/* Aksi */}
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        {/* Reset PIN */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-xs gap-1.5 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                          onClick={() => { setResetTarget(p); setNewPin('') }}
                        >
                          <KeyRoundIcon className="w-3.5 h-3.5" />
                          Reset PIN
                        </Button>

                        {/* Toggle aktif */}
                        <Button
                          variant="outline"
                          size="sm"
                          className={`rounded-xl text-xs gap-1.5 border-slate-200 ${
                            p.isActive
                              ? 'hover:border-red-300 hover:text-red-600 hover:bg-red-50'
                              : 'hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          onClick={() => setToggleTarget(p)}
                        >
                          <PowerIcon className="w-3.5 h-3.5" />
                          {p.isActive ? 'Nonaktifkan' : 'Aktifkan'}
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

      {/* Dialog Reset PIN */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset PIN — {resetTarget?.nama}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-500">
              Masukkan PIN baru untuk{' '}
              <span className="font-semibold text-slate-700">{resetTarget?.nama}</span>.
              Informasikan PIN baru kepada yang bersangkutan.
            </p>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="PIN baru (4–6 digit)"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              className="rounded-xl text-center text-lg tracking-widest"
              autoFocus
            />
          </div>
          <DialogFooter showCloseButton>
            <Button
              onClick={handleResetPin}
              disabled={newPin.length < 4 || isPending}
              className="rounded-2xl bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isPending ? <Loader2Icon className="w-4 h-4 animate-spin" /> : 'Simpan PIN Baru'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Toggle Aktif */}
      <Dialog open={!!toggleTarget} onOpenChange={(o) => !o && setToggleTarget(null)}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {toggleTarget?.isActive ? 'Nonaktifkan' : 'Aktifkan'} Pengajar
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 py-2">
            {toggleTarget?.isActive
              ? `${toggleTarget?.nama} tidak akan bisa login setelah dinonaktifkan. Data setoran & catatan tetap tersimpan.`
              : `${toggleTarget?.nama} akan dapat login kembali setelah diaktifkan.`}
          </p>
          <DialogFooter showCloseButton>
            <Button
              onClick={handleToggleAktif}
              disabled={isPending}
              className={`rounded-2xl text-white ${
                toggleTarget?.isActive
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              {isPending ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : toggleTarget?.isActive ? (
                'Ya, Nonaktifkan'
              ) : (
                'Ya, Aktifkan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
