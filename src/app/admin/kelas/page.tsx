'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Card, CardContent, CardHeader, CardTitle,
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
import { School, Plus, Pencil, Trash2, Loader2, Users } from 'lucide-react'

interface KelasItem {
  id:     string
  nama:   string
  _count: { santri: number }
}

// ── Dialog form (tambah / rename) ─────────────────────────────────────────────
function KelasFormDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open:     boolean
  initial:  KelasItem | null
  onClose:  () => void
  onSaved:  (k: KelasItem) => void
}) {
  const [nama,    setNama]    = useState(initial?.nama ?? '')
  const [loading, setLoading] = useState(false)

  useEffect(() => { setNama(initial?.nama ?? '') }, [initial])

  async function handleSave() {
    if (!nama.trim()) { toast.error('Nama kelas tidak boleh kosong.'); return }
    setLoading(true)
    try {
      const url    = initial ? `/api/admin/kelas/${initial.id}` : '/api/admin/kelas'
      const method = initial ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: nama.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Gagal menyimpan.'); return }
      toast.success(initial ? 'Kelas diperbarui.' : 'Kelas ditambahkan.')
      onSaved(data as KelasItem)
      onClose()
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="rounded-3xl max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Kelas' : 'Tambah Kelas'}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            placeholder="Nama kelas, contoh: Kelas A"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
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

// ── Dialog konfirmasi hapus ───────────────────────────────────────────────────
function DeleteDialog({
  open,
  kelas,
  onClose,
  onDeleted,
}: {
  open:      boolean
  kelas:     KelasItem | null
  onClose:   () => void
  onDeleted: (id: string) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!kelas) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/kelas/${kelas.id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Gagal menghapus kelas.'); return }
      toast.success(`Kelas "${kelas.nama}" dihapus. Santri dipindahkan ke Tanpa Kelas.`)
      onDeleted(kelas.id)
      onClose()
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="rounded-3xl max-w-sm">
        <DialogHeader>
          <DialogTitle>Hapus Kelas</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600 py-2">
          Yakin ingin menghapus kelas <strong>&quot;{kelas?.nama}&quot;</strong>?{' '}
          {(kelas?._count.santri ?? 0) > 0 && (
            <span className="text-amber-600">
              {kelas?._count.santri} santri akan dipindahkan ke Tanpa Kelas.
            </span>
          )}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-2xl">Batal</Button>
          <Button
            onClick={handleDelete}
            disabled={loading}
            className="rounded-2xl bg-rose-500 hover:bg-rose-600 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Halaman ───────────────────────────────────────────────────────────────────
export default function AdminKelasPage() {
  const [kelasList, setKelasList] = useState<KelasItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [formOpen,  setFormOpen]  = useState(false)
  const [editItem,  setEditItem]  = useState<KelasItem | null>(null)
  const [deleteOpen,setDeleteOpen]= useState(false)
  const [deleteItem,setDeleteItem]= useState<KelasItem | null>(null)

  const fetchKelas = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/kelas')
      const data = await res.json()
      setKelasList(Array.isArray(data) ? data : [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchKelas() }, [fetchKelas])

  function handleSaved(k: KelasItem) {
    setKelasList((prev) => {
      const idx = prev.findIndex((x) => x.id === k.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = k; return next }
      return [...prev, k]
    })
  }

  function handleDeleted(id: string) {
    setKelasList((prev) => prev.filter((k) => k.id !== id))
  }

  const totalSantri = kelasList.reduce((s, k) => s + k._count.santri, 0)

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <School className="w-5 h-5 text-blue-500" /> Manajemen Kelas
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{kelasList.length} kelas · {totalSantri} santri aktif</p>
        </div>
        <Button
          onClick={() => { setEditItem(null); setFormOpen(true) }}
          className="rounded-2xl bg-blue-500 hover:bg-blue-600 text-white gap-2"
        >
          <Plus className="w-4 h-4" /> Tambah Kelas
        </Button>
      </div>

      <Card className="rounded-3xl border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
          ) : kelasList.length === 0 ? (
            <div className="text-center py-16">
              <School className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">Belum ada kelas. Tambahkan kelas pertama.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kelas</TableHead>
                  <TableHead className="text-center">Santri Aktif</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kelasList.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-semibold text-slate-700">{k.nama}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="gap-1 rounded-full">
                        <Users className="w-3 h-3" />{k._count.santri}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl h-8 px-3 text-slate-500 hover:text-blue-600"
                          onClick={() => { setEditItem(k); setFormOpen(true) }}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl h-8 px-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => { setDeleteItem(k); setDeleteOpen(true) }}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
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

      <KelasFormDialog
        open={formOpen}
        initial={editItem}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
      <DeleteDialog
        open={deleteOpen}
        kelas={deleteItem}
        onClose={() => setDeleteOpen(false)}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
