import Link from 'next/link'
import { Suspense } from 'react'
import { BookOpenIcon, ShieldCheckIcon, WifiOffIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import NisSearch   from '@/components/NisSearch'
import StatsCards  from '@/components/StatsCards'
import { prisma }  from '@/lib/prisma'

// ── Data fetch helpers ────────────────────────────────────────────────────────
function startOfWeek(): Date {
  const now  = new Date()
  const day  = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const mon  = new Date(now)
  mon.setDate(diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

function thirtyDaysAgo(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  d.setHours(0, 0, 0, 0)
  return d
}

async function getStats() {
  const [totalSantri, setoranGroup, absensiGroup] = await Promise.all([
    prisma.santri.count({ where: { isActive: true } }),
    prisma.setoran.groupBy({
      by:     ['tipe'],
      where:  { tanggal: { gte: startOfWeek() } },
      _count: { _all: true },
    }),
    prisma.absensi.groupBy({
      by:     ['status'],
      where:  { tanggal: { gte: thirtyDaysAgo() } },
      _count: { _all: true },
    }),
  ])

  const setoranAlQuran   = setoranGroup.find((r) => r.tipe === 'AL_QURAN')?._count._all  ?? 0
  const setoranPraTahsin = setoranGroup.find((r) => r.tipe === 'PRA_TAHSIN')?._count._all ?? 0
  const totalAbsensi     = absensiGroup.reduce((s, r) => s + r._count._all, 0)
  const totalHadir       = absensiGroup.find((r) => r.status === 'HADIR')?._count._all ?? 0

  return {
    totalSantri,
    setoranMingguIni: {
      alQuran:   setoranAlQuran,
      praTahsin: setoranPraTahsin,
      total:     setoranAlQuran + setoranPraTahsin,
    },
    kehadiran: {
      persentase: totalAbsensi > 0 ? Math.round((totalHadir / totalAbsensi) * 100) : 0,
      hadir:      totalHadir,
      total:      totalAbsensi,
    },
  }
}

// ── Sub-komponen: Statistik dengan Suspense ───────────────────────────────────
async function StatsSection() {
  const stats = await getStats()
  return <StatsCards stats={stats} />
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-36 rounded-3xl bg-slate-100 animate-pulse" />
      ))}
    </div>
  )
}

// ── Fitur-fitur highlights ────────────────────────────────────────────────────
const features = [
  {
    icon: '📖',
    title: 'Pantau Hafalan',
    desc: "Lihat progres setoran Al-Qur'an & Pra-Tahsin anak Anda secara real-time.",
  },
  {
    icon: '📅',
    title: 'Riwayat Absensi',
    desc: 'Rekap kehadiran harian & ringkasan kehadiran bulanan tersedia kapan saja.',
  },
  {
    icon: '🔔',
    title: 'Notifikasi Push',
    desc: 'Terima notifikasi langsung ke HP saat setoran baru tercatat oleh pengajar.',
  },
]

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-extrabold text-blue-600">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm shadow">
              📖
            </div>
            <span className="text-slate-800">SMSTPQ</span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/panduan"
              className="text-sm text-slate-500 hover:text-blue-600 transition-colors hidden sm:block"
            >
              Panduan
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 text-sm"
              >
                Login Pengajar
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white">
          {/* Dekorasi lingkaran */}
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-white/5" />

          <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <span>✨</span>
              <span>Platform manajemen TPQ gratis &amp; tanpa iklan</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">
              Pantau Perkembangan
              <br />
              <span className="text-amber-300">Anak di TPQ</span>
            </h1>

            <p className="text-blue-100 text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              Orang tua dapat memantau hafalan, absensi, dan progres belajar anak
              kapan saja — cukup dengan NIS 8 digit, tanpa perlu login.
            </p>

            {/* Form pencarian NIS */}
            <NisSearch />
          </div>
        </section>

        {/* ── Statistik ──────────────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 -mt-6">
          <Suspense fallback={<StatsSkeleton />}>
            <StatsSection />
          </Suspense>
        </section>

        {/* ── Cara kerja ─────────────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-2">
              Cara Menggunakan
            </h2>
            <p className="text-slate-500 text-sm">Tiga langkah mudah untuk wali murid</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Dapatkan NIS',    desc: 'Minta NIS 8 digit anak Anda kepada pengajar atau admin TPQ.' },
              { step: '2', title: 'Masukkan NIS',    desc: 'Ketikkan NIS di kolom pencarian di atas lalu tekan Cari.' },
              { step: '3', title: 'Pantau Progres',  desc: 'Lihat riwayat setoran, absensi, dan catatan dari pengajar.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-500 text-white text-xl font-extrabold flex items-center justify-center mx-auto mb-4 shadow-md">
                  {step}
                </div>
                <h3 className="font-bold text-slate-700 mb-1">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Fitur ──────────────────────────────────────────────────────── */}
        <section className="bg-white border-y border-slate-100 py-16">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-2">
                Fitur Unggulan
              </h2>
              <p className="text-slate-500 text-sm">Semua yang Anda butuhkan dalam satu platform</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {features.map(({ icon, title, desc }) => (
                <Card key={title} className="rounded-3xl border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="text-3xl mb-3">{icon}</div>
                    <h3 className="font-bold text-slate-700 mb-1.5">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Keamanan callout ───────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 py-16">
          <Card className="rounded-3xl bg-gradient-to-br from-blue-50 to-slate-50 border-blue-100 shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <ShieldCheckIcon className="w-7 h-7 text-blue-500" />
                <WifiOffIcon className="w-6 h-6 text-slate-400" />
                <BookOpenIcon className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">
                Aman, Gratis, Bisa Offline
              </h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                Data santri dilindungi dengan sistem autentikasi PIN + rate limiting.
                Aplikasi dapat dipasang di HP dan bekerja saat koneksi terbatas.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-100 py-6">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} SMSTPQ — Sistem Manajemen Santri TPQ</p>
          <div className="flex gap-4">
            <Link href="/panduan" className="hover:text-blue-500 transition-colors">Panduan Wali</Link>
            <Link href="/login"   className="hover:text-blue-500 transition-colors">Login Pengajar</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
