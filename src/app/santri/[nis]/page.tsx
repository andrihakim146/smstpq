export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon, GraduationCapIcon, TargetIcon, CalendarIcon, PhoneIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import SantriTabs, { NotificationButton } from '@/components/SantriTabs'
import WhatsAppButton from '@/components/WhatsAppButton'
import type {
  SetoranItem, CatatanItem, AbsensiItem,
} from '@/components/SantriTabs'

// Revalidasi setiap 30 detik
export const revalidate = 30

// ── Meta dinamis ──────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ nis: string }>
}) {
  const { nis } = await params
  const santri = await prisma.santri.findUnique({
    where:  { nis },
    select: { nama: true },
  })
  if (!santri) return { title: 'Santri tidak ditemukan — SMSTPQ' }
  return {
    title: `${santri.nama} (${nis}) — SMSTPQ`,
    description: `Lihat perkembangan hafalan, catatan, dan absensi ${santri.nama} di SMSTPQ.`,
  }
}

// ── Data fetch ────────────────────────────────────────────────────────────────
async function getSantriData(nis: string) {
  if (!/^\d{8}$/.test(nis)) return null

  const santri = await prisma.santri.findUnique({
    where:  { nis },
    select: {
      id:                 true,
      nis:                true,
      nama:               true,
      isActive:           true,
      createdAt:          true,
      targetPembelajaran: true,
      deadlineTarget:     true,
      noWaWali:           true,
      kelas: { select: { nama: true } },
    },
  })

  if (!santri || !santri.isActive) return null

  const [setoranRaw, catatanRaw, absensiRaw] = await Promise.all([
    prisma.setoran.findMany({
      where:   { santriId: santri.id },
      orderBy: { tanggal: 'desc' },
      select: {
        id:             true,
        tanggal:        true,
        tipe:           true,
        surah:          true,
        ayatMulai:      true,
        ayatSelesai:    true,
        kategori:       true,
        nilai:          true,
        halamanMulai:   true,
        halamanSelesai: true,
        pengajar: { select: { nama: true } },
        kitab:    { select: { nama: true } },
      },
    }),
    prisma.catatan.findMany({
      where:   { santriId: santri.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id:        true,
        isi:       true,
        createdAt: true,
        pengajar:  { select: { nama: true } },
      },
    }),
    prisma.absensi.findMany({
      where:   { santriId: santri.id },
      orderBy: { tanggal: 'desc' },
      take:    365,
      select: {
        id:         true,
        tanggal:    true,
        status:     true,
        keterangan: true,
      },
    }),
  ])

  return { santri, setoranRaw, catatanRaw, absensiRaw }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: Date | string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return null
  return new Date(d).toLocaleDateString('id-ID', opts ?? {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── Halaman ───────────────────────────────────────────────────────────────────
export default async function SantriDetailPage({
  params,
}: {
  params: Promise<{ nis: string }>
}) {
  const { nis } = await params
  const data = await getSantriData(nis)

  if (!data) notFound()

  const { santri, setoranRaw, catatanRaw, absensiRaw } = data

  // Serialisasi agar aman dikirim ke client component
  const setoran: SetoranItem[] = setoranRaw.map((s) => ({
    ...s,
    tanggal:  s.tanggal.toISOString(),
    kategori: s.kategori ?? null,
    kitab:    s.kitab ?? null,
  }))

  const catatan: CatatanItem[] = catatanRaw.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }))

  const absensi: AbsensiItem[] = absensiRaw.map((a) => ({
    ...a,
    tanggal: a.tanggal.toISOString(),
  }))

  // Hitung ringkasan cepat
  const setoranMingguIni = (() => {
    const mon = new Date()
    const diff = mon.getDate() - mon.getDay() + (mon.getDay() === 0 ? -6 : 1)
    mon.setDate(diff)
    mon.setHours(0, 0, 0, 0)
    return setoran.filter((s) => new Date(s.tanggal) >= mon).length
  })()

  const hadirCount  = absensi.filter((a) => a.status === 'HADIR').length
  const persen      = absensi.length > 0 ? Math.round((hadirCount / absensi.length) * 100) : null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Topbar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="rounded-full gap-1.5 text-slate-500 hover:text-slate-800">
              <ArrowLeftIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Beranda</span>
            </Button>
          </Link>
          <span className="text-slate-300">|</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm truncate">{santri.nama}</p>
            <p className="text-xs text-slate-400 font-mono">NIS {santri.nis}</p>
          </div>
          <NotificationButton santriNis={santri.nis} />
          {santri.noWaWali && setoran.length > 0 && (
            <WhatsAppButton
              setoran={{
                tanggal:        setoran[0].tanggal,
                tipe:           setoran[0].tipe,
                surah:          setoran[0].surah,
                ayatMulai:      setoran[0].ayatMulai,
                ayatSelesai:    setoran[0].ayatSelesai,
                kategori:       setoran[0].kategori,
                kitabNama:      setoran[0].kitab?.nama,
                halamanMulai:   setoran[0].halamanMulai,
                halamanSelesai: setoran[0].halamanSelesai,
                nilai:          setoran[0].nilai,
              }}
              santri={{ nama: santri.nama, nis: santri.nis, noWaWali: santri.noWaWali }}
              className="text-xs px-3 py-1.5"
            />
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* ── Info santri ────────────────────────────────────────────── */}
        <Card className="rounded-3xl border-0 shadow-md overflow-hidden">
          {/* Header card gradien */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 px-5 pt-5 pb-10 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-extrabold leading-tight">{santri.nama}</h1>
                <p className="text-blue-200 text-sm font-mono mt-0.5">NIS {santri.nis}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl shrink-0">
                🎓
              </div>
            </div>
          </div>

          {/* Detail dengan overlap */}
          <CardContent className="-mt-6 pt-0 px-5 pb-5">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
              {/* Kelas */}
              <InfoRow
                icon={<GraduationCapIcon className="w-4 h-4 text-blue-500" />}
                label="Kelas"
                value={santri.kelas?.nama ?? '—'}
              />

              {/* Target pembelajaran */}
              {santri.targetPembelajaran && (
                <InfoRow
                  icon={<TargetIcon className="w-4 h-4 text-amber-500" />}
                  label="Target"
                  value={santri.targetPembelajaran}
                />
              )}

              {/* Deadline */}
              {santri.deadlineTarget && (
                <InfoRow
                  icon={<CalendarIcon className="w-4 h-4 text-violet-500" />}
                  label="Deadline"
                  value={fmtDate(santri.deadlineTarget) ?? '—'}
                />
              )}

              {/* No WA Wali */}
              {santri.noWaWali && (
                <InfoRow
                  icon={<PhoneIcon className="w-4 h-4 text-emerald-500" />}
                  label="WA Wali"
                  value={santri.noWaWali}
                />
              )}

              {/* Bergabung */}
              <InfoRow
                icon={<CalendarIcon className="w-4 h-4 text-slate-400" />}
                label="Bergabung"
                value={fmtDate(santri.createdAt) ?? '—'}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Statistik ringkasan ─────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <MiniStat
            value={setoran.length.toString()}
            label="Total Setoran"
            color="bg-blue-50 text-blue-700 border-blue-100"
          />
          <MiniStat
            value={setoranMingguIni.toString()}
            label="Minggu Ini"
            color="bg-amber-50 text-amber-700 border-amber-100"
          />
          <MiniStat
            value={persen !== null ? `${persen}%` : '—'}
            label="Kehadiran"
            color="bg-emerald-50 text-emerald-700 border-emerald-100"
          />
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────── */}
        <Card className="rounded-3xl border-0 shadow-md">
          <CardContent className="p-5">
            <SantriTabs
              setoran={setoran}
              catatan={catatan}
              absensi={absensi}
            />
          </CardContent>
        </Card>

        {/* ── Footer kecil ───────────────────────────────────────────── */}
        <p className="text-center text-xs text-slate-400 pb-4">
          Data diperbarui otomatis setiap 30 detik ·{' '}
          <Link href="/" className="text-blue-400 hover:underline">Cari santri lain</Link>
        </p>
      </div>
    </div>
  )
}

// ── Sub-komponen kecil ────────────────────────────────────────────────────────
function InfoRow({
  icon, label, value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <span className="text-xs text-slate-400 w-16 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-700 flex-1 min-w-0 truncate">{value}</span>
    </div>
  )
}

function MiniStat({
  value, label, color,
}: {
  value: string
  label: string
  color: string
}) {
  return (
    <div className={`rounded-2xl border p-3 text-center ${color}`}>
      <p className="text-2xl font-extrabold leading-none">{value}</p>
      <p className="text-[11px] font-medium mt-1">{label}</p>
    </div>
  )
}
