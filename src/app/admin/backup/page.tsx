'use client'

import { useState, useRef } from 'react'
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
  Download, Upload, Loader2, ShieldCheck, AlertTriangle,
  Eye, EyeOff, Database, RotateCcw, Lock, Info,
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────
function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value:       string
  onChange:    (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Kata sandi enkripsi (min. 8 karakter)'}
        className="pl-9 pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

interface ImportedStats {
  pengajar: number; kelas: number; kitab: number; santri: number
  setoran: number;  catatan: number; absensi: number
}

// ── Halaman ───────────────────────────────────────────────────────────────────
export default function AdminBackupPage() {
  // ── Backup section ─────────────────────────────────────────────────────────
  const [dlPassword,   setDlPassword]   = useState('')
  const [downloading,  setDownloading]  = useState(false)

  // ── Restore section ────────────────────────────────────────────────────────
  const [restoreFile,  setRestoreFile]  = useState<File | null>(null)
  const [restorePass,  setRestorePass]  = useState('')
  const [restoreMode,  setRestoreMode]  = useState<'skip' | 'overwrite'>('skip')
  const [restoring,    setRestoring]    = useState(false)
  const [restoreResult,setRestoreResult]= useState<{ backupDate: string; imported: ImportedStats } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Dialog konfirmasi restore ───────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false)

  // ── Download backup ────────────────────────────────────────────────────────
  async function handleDownload() {
    if (dlPassword.length < 8) { toast.error('Password minimal 8 karakter.'); return }
    setDownloading(true)
    try {
      const res = await fetch('/api/admin/backup/download', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password: dlPassword }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? 'Gagal membuat backup.')
        return
      }
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match       = disposition.match(/filename="?([^"]+)"?/)
      const filename    = match?.[1] ?? `backup-smstpq-${new Date().toISOString().slice(0, 10)}.json.enc`

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      toast.success(`Backup berhasil diunduh: ${filename}`)
      setDlPassword('')
    } finally { setDownloading(false) }
  }

  // ── Restore ────────────────────────────────────────────────────────────────
  async function handleRestore() {
    setConfirmOpen(false)
    if (!restoreFile) { toast.error('Pilih file backup.'); return }
    if (restorePass.length < 8) { toast.error('Password minimal 8 karakter.'); return }

    setRestoring(true)
    setRestoreResult(null)
    try {
      const fd = new FormData()
      fd.append('file',     restoreFile)
      fd.append('password', restorePass)
      fd.append('mode',     restoreMode)

      const res  = await fetch('/api/admin/backup/restore', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Restore gagal.')
        return
      }
      setRestoreResult({ backupDate: data.backupDate, imported: data.imported })
      toast.success('Restore berhasil!')
      setRestoreFile(null)
      setRestorePass('')
      if (fileRef.current) fileRef.current.value = ''
    } finally { setRestoring(false) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" /> Backup & Restore Database
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Ekspor seluruh data terenkripsi dan impor kembali
        </p>
      </div>

      {/* Info */}
      <Card className="rounded-3xl border-0 shadow-sm bg-blue-50">
        <CardContent className="p-4 flex gap-3">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 space-y-1">
            <p>File backup dienkripsi dengan <strong>AES-256-CBC</strong> + <strong>PBKDF2-SHA256</strong> dan dikompresi sebelum enkripsi.</p>
            <p>Password <strong>tidak disimpan</strong> di server. Simpan password di tempat aman — backup tidak dapat dibuka tanpa password yang benar.</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Bagian Backup ─────────────────────────────────────────────────── */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-500" /> Unduh Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Password Enkripsi <span className="text-rose-500">*</span>
            </label>
            <PasswordInput value={dlPassword} onChange={setDlPassword} />
            <p className="text-xs text-slate-400">
              Digunakan untuk mengenkripsi file backup. Catat dan simpan dengan aman.
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            Mencakup: Pengajar, Santri, Kelas, Kitab, Setoran, Catatan, Absensi
          </div>

          <Button
            onClick={handleDownload}
            disabled={downloading || dlPassword.length < 8}
            className="w-full h-11 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold gap-2"
          >
            {downloading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan backup…</>
              : <><Download className="w-4 h-4" /> Unduh Backup Terenkripsi</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* ── Bagian Restore ────────────────────────────────────────────────── */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
            <Upload className="w-4 h-4 text-amber-500" /> Pulihkan dari Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-4">
          {/* File picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">File Backup (.json.enc)</label>
            <div
              className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {restoreFile ? (
                <div>
                  <p className="text-sm font-semibold text-slate-700 truncate">{restoreFile.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(restoreFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Klik untuk pilih file backup</p>
                  <p className="text-xs text-slate-400 mt-1">Format: *.json.enc</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".enc,.json.enc"
              className="hidden"
              onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Password Enkripsi <span className="text-rose-500">*</span>
            </label>
            <PasswordInput
              value={restorePass}
              onChange={setRestorePass}
              placeholder="Password yang digunakan saat backup"
            />
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Mode Konflik Data</label>
            <div className="space-y-2">
              {([
                {
                  value:   'skip',
                  label:   'Lewati data yang sudah ada',
                  desc:    'Record dengan ID yang sama tidak diubah. Aman untuk sinkronisasi.',
                  color:   'border-blue-300 bg-blue-50 text-blue-700',
                },
                {
                  value:   'overwrite',
                  label:   'Timpa data yang sudah ada',
                  desc:    'Record dengan ID yang sama akan diperbarui. Cocok untuk pemulihan penuh.',
                  color:   'border-amber-300 bg-amber-50 text-amber-700',
                },
              ] as const).map(({ value, label, desc, color }) => (
                <label
                  key={value}
                  className={`flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                    restoreMode === value ? color : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="restoreMode"
                    value={value}
                    checked={restoreMode === value}
                    onChange={() => setRestoreMode(value)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {restoreMode === 'overwrite' && (
            <div className="flex gap-2 p-3 rounded-2xl bg-amber-50 text-xs text-amber-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Mode timpa akan memperbarui data yang ada. Pastikan Anda telah membuat backup terbaru sebelum melanjutkan.
            </div>
          )}

          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={restoring || !restoreFile || restorePass.length < 8}
            className="w-full h-11 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold gap-2"
          >
            {restoring
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Memulihkan data…</>
              : <><RotateCcw className="w-4 h-4" /> Restore Database</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* Hasil restore */}
      {restoreResult && (
        <Card className="rounded-3xl border-0 shadow-sm bg-emerald-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <p className="font-bold text-emerald-800 text-sm">Restore Berhasil</p>
              <button
                type="button"
                onClick={() => setRestoreResult(null)}
                className="ml-auto text-emerald-400 hover:text-emerald-600 text-lg leading-none"
              >×</button>
            </div>
            <p className="text-xs text-emerald-600 mb-3">
              Dari backup tanggal: {new Date(restoreResult.backupDate).toLocaleString('id-ID')}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(restoreResult.imported).map(([k, v]) => (
                <div key={k} className="bg-white rounded-xl p-2 text-center">
                  <p className="text-lg font-extrabold text-emerald-700">{v}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{k}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog konfirmasi restore */}
      <Dialog open={confirmOpen} onOpenChange={(o) => { if (!o) setConfirmOpen(false) }}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Konfirmasi Restore
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2 text-sm text-slate-600">
            <p>
              File <strong className="text-slate-800">{restoreFile?.name}</strong> akan digunakan untuk restore database dengan mode{' '}
              <strong className={restoreMode === 'overwrite' ? 'text-amber-600' : 'text-blue-600'}>
                {restoreMode === 'skip' ? 'Lewati Konflik' : 'Timpa Konflik'}
              </strong>.
            </p>
            <p className="text-rose-500 font-medium">Proses ini tidak dapat dibatalkan di tengah jalan.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="rounded-2xl">Batal</Button>
            <Button onClick={handleRestore} className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold">
              Ya, Mulai Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
