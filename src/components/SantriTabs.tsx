'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge  } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  BookMarkedIcon, MessageSquareIcon, CalendarCheckIcon,
  UserIcon, BellIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SetoranItem {
  id:             string
  tanggal:        string
  tipe:           'AL_QURAN' | 'PRA_TAHSIN'
  surah:          string | null
  ayatMulai:      number | null
  ayatSelesai:    number | null
  kategori:       string | null
  nilai:          string | null
  halamanMulai:   number | null
  halamanSelesai: number | null
  pengajar: { nama: string }
  kitab:    { nama: string } | null
}

export interface CatatanItem {
  id:        string
  isi:       string
  createdAt: string
  pengajar:  { nama: string }
}

export interface AbsensiItem {
  id:         string
  tanggal:    string
  status:     'HADIR' | 'TIDAK_HADIR' | 'IZIN' | 'SAKIT'
  keterangan: string | null
}

export interface SantriTabsProps {
  setoran: SetoranItem[]
  catatan: CatatanItem[]
  absensi: AbsensiItem[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTanggal(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function setoranDetail(s: SetoranItem): string {
  if (s.tipe === 'AL_QURAN' && s.surah) {
    return `${s.surah} ${s.ayatMulai}–${s.ayatSelesai}`
  }
  if (s.tipe === 'PRA_TAHSIN' && s.kitab) {
    return `${s.kitab.nama} hal. ${s.halamanMulai}–${s.halamanSelesai}`
  }
  return '—'
}

const statusColor: Record<AbsensiItem['status'], string> = {
  HADIR:       'bg-emerald-400',
  TIDAK_HADIR: 'bg-red-400',
  IZIN:        'bg-amber-400',
  SAKIT:       'bg-blue-400',
}

const statusLabel: Record<AbsensiItem['status'], string> = {
  HADIR: 'Hadir', TIDAK_HADIR: 'Alpha', IZIN: 'Izin', SAKIT: 'Sakit',
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function AbsensiCalendar({ absensi }: { absensi: AbsensiItem[] }) {
  const [viewDate, setViewDate] = useState(() => {
    // Default ke bulan paling baru yang ada absensi, atau bulan ini
    if (absensi.length > 0) {
      const latest = absensi.reduce((a, b) =>
        new Date(a.tanggal) > new Date(b.tanggal) ? a : b,
      )
      const d = new Date(latest.tanggal)
      return { year: d.getFullYear(), month: d.getMonth() }
    }
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  // Buat map tanggal → status untuk bulan ini
  const dayMap = new Map<string, AbsensiItem['status']>()
  absensi.forEach((a) => {
    const d = new Date(a.tanggal)
    if (d.getFullYear() === viewDate.year && d.getMonth() === viewDate.month) {
      dayMap.set(d.getDate().toString(), a.status)
    }
  })

  const firstDay   = new Date(viewDate.year, viewDate.month, 1).getDay() // 0=Min
  const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1 // Senin = 0

  const prevMonth = () => setViewDate((v) => {
    const m = v.month === 0 ? 11 : v.month - 1
    const y = v.month === 0 ? v.year - 1 : v.year
    return { year: y, month: m }
  })
  const nextMonth = () => setViewDate((v) => {
    const m = v.month === 11 ? 0 : v.month + 1
    const y = v.month === 11 ? v.year + 1 : v.year
    return { year: y, month: m }
  })

  const monthName = new Date(viewDate.year, viewDate.month, 1)
    .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  return (
    <div className="select-none">
      {/* Navigator bulan */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">‹</button>
        <span className="text-sm font-semibold text-slate-700 capitalize">{monthName}</span>
        <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">›</button>
      </div>

      {/* Header hari */}
      <div className="grid grid-cols-7 mb-1">
        {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Grid tanggal */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Padding awal */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day    = i + 1
          const status = dayMap.get(day.toString())
          return (
            <div
              key={day}
              title={status ? statusLabel[status] : undefined}
              className={`
                aspect-square flex items-center justify-center rounded-full text-xs font-medium transition-colors
                ${status
                  ? `${statusColor[status]} text-white`
                  : 'text-slate-400 hover:bg-slate-100'}
              `}
            >
              {day}
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 mt-4 text-xs text-slate-500">
        {(Object.entries(statusLabel) as [AbsensiItem['status'], string][]).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${statusColor[k]}`} />
            {v}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Ringkasan absensi ─────────────────────────────────────────────────────────
function AbsensiSummary({ absensi }: { absensi: AbsensiItem[] }) {
  const count = { HADIR: 0, TIDAK_HADIR: 0, IZIN: 0, SAKIT: 0 }
  absensi.forEach((a) => count[a.status]++)
  const total = absensi.length
  const persen = total > 0 ? Math.round((count.HADIR / total) * 100) : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {(
        [
          { key: 'HADIR',       label: 'Hadir',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { key: 'TIDAK_HADIR', label: 'Alpha',  color: 'bg-red-50     text-red-700     border-red-200'    },
          { key: 'IZIN',        label: 'Izin',   color: 'bg-amber-50   text-amber-700   border-amber-200'  },
          { key: 'SAKIT',       label: 'Sakit',  color: 'bg-blue-50    text-blue-700    border-blue-200'   },
        ] as const
      ).map(({ key, label, color }) => (
        <div key={key} className={`rounded-2xl border p-3 text-center ${color}`}>
          <p className="text-2xl font-extrabold">{count[key]}</p>
          <p className="text-xs font-medium">{label}</p>
        </div>
      ))}

      {total > 0 && (
        <div className="col-span-2 sm:col-span-4 rounded-2xl bg-slate-50 border border-slate-200 p-3 flex items-center gap-3">
          <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-400 h-2 rounded-full transition-all"
              style={{ width: `${persen}%` }}
            />
          </div>
          <span className="text-sm font-bold text-slate-600 shrink-0">{persen}% kehadiran</span>
        </div>
      )}
    </div>
  )
}

// ── Komponen utama ─────────────────────────────────────────────────────────────
export default function SantriTabs({ setoran, catatan, absensi }: SantriTabsProps) {
  return (
    <Tabs defaultValue="setoran">
      <TabsList variant="line" className="w-full mb-4 border-b border-slate-200 rounded-none bg-transparent h-auto pb-0">
        <TabsTrigger value="setoran" className="gap-1.5 pb-3 text-sm">
          <BookMarkedIcon className="w-4 h-4" />
          Setoran
          {setoran.length > 0 && (
            <span className="ml-1 text-xs bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5 font-bold">
              {setoran.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="catatan" className="gap-1.5 pb-3 text-sm">
          <MessageSquareIcon className="w-4 h-4" />
          Catatan
          {catatan.length > 0 && (
            <span className="ml-1 text-xs bg-amber-100 text-amber-600 rounded-full px-1.5 py-0.5 font-bold">
              {catatan.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="absensi" className="gap-1.5 pb-3 text-sm">
          <CalendarCheckIcon className="w-4 h-4" />
          Absensi
        </TabsTrigger>
      </TabsList>

      {/* ── Tab Setoran ──────────────────────────────────────────────────── */}
      <TabsContent value="setoran">
        {setoran.length === 0 ? (
          <EmptyState icon="📖" text="Belum ada catatan setoran." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100">
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead className="text-center">Nilai</TableHead>
                  <TableHead>Pengajar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {setoran.map((s) => (
                  <TableRow key={s.id} className="border-slate-100 hover:bg-slate-50">
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {fmtTanggal(s.tanggal)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`rounded-full text-xs font-medium ${
                        s.tipe === 'AL_QURAN'
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {s.tipe === 'AL_QURAN' ? "Al-Qur'an" : 'Pra-Tahsin'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700 min-w-36">
                      {setoranDetail(s)}
                      {s.kategori && (
                        <span className="ml-1.5 text-[10px] text-slate-400 uppercase tracking-wide">
                          ({s.kategori === 'ZIYADAH' ? 'Ziyadah' : 'Murojaah'})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.nilai ? (
                        <Badge variant="outline" className="rounded-full border-emerald-200 text-emerald-700 bg-emerald-50 text-xs">
                          {s.nilai}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />{s.pengajar.nama}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      {/* ── Tab Catatan ──────────────────────────────────────────────────── */}
      <TabsContent value="catatan">
        {catatan.length === 0 ? (
          <EmptyState icon="💬" text="Belum ada catatan dari pengajar." />
        ) : (
          <div className="space-y-3">
            {catatan.map((c) => (
              <Card key={c.id} className="rounded-2xl border-slate-100 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{c.isi}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />{c.pengajar.nama}
                    </span>
                    <span>·</span>
                    <span>{fmtTanggal(c.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* ── Tab Absensi ──────────────────────────────────────────────────── */}
      <TabsContent value="absensi">
        {absensi.length === 0 ? (
          <EmptyState icon="📅" text="Belum ada data absensi." />
        ) : (
          <>
            <AbsensiSummary absensi={absensi} />
            <Card className="rounded-3xl border-slate-100 shadow-sm">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
                  <CalendarCheckIcon className="w-4 h-4" />
                  Kalender Kehadiran
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <AbsensiCalendar absensi={absensi} />
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>
    </Tabs>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-slate-400 gap-2">
      <span className="text-4xl">{icon}</span>
      <p className="text-sm">{text}</p>
    </div>
  )
}

// ── NotificationButton re-export dari PushSubscribeButton ────────────────────
// Digunakan di /santri/[nis]/page.tsx — wired dengan santriNis via props.
// Diekspor sebagai alias untuk backward compatibility.
export { default as NotificationButton } from '@/components/PushSubscribeButton'
