'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { BookOpen, Plus, Pencil, Loader2, ToggleLeft, ToggleRight, BookMarked } from 'lucide-react'

interface KitabItem {
  id:        string
  nama:      string
  isActive:  boolean
  createdAt: string
  _count:    { setoran: number }
}

// ── Dialog form ───────────────────────────────────────────────────────────────
function KitabFormDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open:    boolean
  initial: KitabItem | null
  onClose: () => void
  onSaved: (k: KitabItem) => void
}) {
  const [nama,    setNama]    = useState(initial?.nama ?? '')
  const [loading, setLoading] = useState(false)

  useEffect(() => { setNama(initial?.nama ?? '') }, [initial])

  async function handleSave() {
    if (!nama.trim()) { toast.error('Nama kitab tidak boleh kosong.'); return }
    setLoading(true)
    try {
      const url    = initial ? `/api/admin/kitab/${initial.id}` : '/api/admin/kitab'
      const method = initial ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: nama.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Gagal menyimpan.'); return }
      toast.success(initial ? 'Kitab diperbarui.' : 'Kitab ditambahkan.')
      onSaved(data as KitabItem)
      onClose()
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="rounded-3xl max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Nama Kitab' : 'Tambah Kitab'}</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-1">
          <label className="text-sm font-semibold text-slate-700">Nama Kitab</label>
          <Input
            placeholder="Contoh: Iqro 1, Yanbu'a 2, Tilawati 3"
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

// ── Halaman ───────────────────────────────────────────────────────────────────
export default function AdminKitabPage() {
  const [kitabList, setKitabList] = useState<KitabItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [formOpen,  setFormOpen]  = useState(false)
  const [editItem,  setEditItem]  = useState<KitabItem | null>(null)
  const [toggling,  setToggling]  = useState<string | null>(null)

  const fetchKitab = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/kitab')
      const data = await res.json()
      setKitabList(Array.isArray(data) ? data : [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchKitab() }, [fetchKitab])

  function handleSaved(k: KitabItem) {
    setKitabList((prev) => {
      const idx = prev.findIndex((x) => x.id === k.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = k; return next }
      return [...prev, k]
    })
  }

  async function toggleActive(k: KitabItem) {
    setToggling(k.id)
    try {
      const res  = await fetch(`/api/admin/kitab/${k.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive: !k.isActive }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Gagal.'); return }
      toast.success(`Kitab "${k.nama}" ${data.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`)
      setKitabList((prev) => prev.map((x) => x.id === k.id ? { ...x, isActive: data.isActive } : x))
    } finally { setToggling(null) }
  }

  const aktifCount = kitabList.filter((k) => k.isActive).length

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" /> Manajemen Kitab
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {aktifCount} aktif · {kitabList.length - aktifCount} nonaktif
          </p>
        </div>
        <Button
          onClick={() => { setEditItem(null); setFormOpen(true) }}
          className="rounded-2xl bg-blue-500 hover:bg-blue-600 text-white gap-2"
        >
          <Plus className="w-4 h-4" /> Tambah Kitab
        </Button>
      </div>

      <Card className="rounded-3xl border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
          ) : kitabList.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">Belum ada kitab. Tambahkan referensi pertama.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kitab</TableHead>
                  <TableHead className="text-center">Total Setoran</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kitabList.map((k) => (
                  <TableRow key={k.id} className={!k.isActive ? 'opacity-50' : undefined}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BookMarked className={`w-4 h-4 shrink-0 ${k.isActive ? 'text-amber-500' : 'text-slate-300'}`} />
                        <span className="font-semibold text-slate-700">{k.nama}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm text-slate-500">
                      {k._count.setoran.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={`rounded-full text-xs ${
                          k.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {k.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
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
                          disabled={toggling === k.id}
                          onClick={() => toggleActive(k)}
                          className={`rounded-xl h-8 px-3 ${
                            k.isActive
                              ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {toggling === k.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            : k.isActive
                              ? <ToggleRight className="w-3.5 h-3.5 mr-1" />
                              : <ToggleLeft  className="w-3.5 h-3.5 mr-1" />
                          }
                          {k.isActive ? 'Nonaktifkan' : 'Aktifkan'}
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

      <KitabFormDialog
        open={formOpen}
        initial={editItem}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
