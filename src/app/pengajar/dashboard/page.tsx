import { getSession } from '@/lib/session'
import { prisma }     from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookMarkedIcon, CalendarCheckIcon, UsersIcon, TrendingUpIcon } from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────
function weekRange() {
  const now  = new Date()
  const day  = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const mon  = new Date(now); mon.setDate(diff); mon.setHours(0, 0, 0, 0)
  const sun  = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999)
  return { mon, sun }
}

const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

async function getDashboardData(pengajarId: string) {
  const { mon, sun } = weekRange()

  const [setoranMinggu, totalSantri, setoranTerbaru] = await Promise.all([
    // Setoran minggu ini
    prisma.setoran.findMany({
      where: {
        pengajarId: pengajarId,
        tanggal:    { gte: mon, lte: sun },
      },
      select: { tanggal: true, tipe: true },
    }),
    // Total santri aktif
    prisma.santri.count({ where: { isActive: true } }),
    // 5 setoran terbaru
    prisma.setoran.findMany({
      where:   { pengajarId },
      orderBy: { tanggal: 'desc' },
      take:    5,
      select: {
        id:         true,
        tanggal:    true,
        tipe:       true,
        surah:      true,
        ayatMulai:  true,
        ayatSelesai:true,
        halamanMulai:   true,
        halamanSelesai: true,
        nilai:      true,
        santri:     { select: { nama: true, nis: true } },
        kitab:      { select: { nama: true } },
      },
    }),
  ])

  // Kelompokkan per hari (0=Sen ... 6=Min)
  const perHari = Array.from({ length: 7 }, () => 0)
  setoranMinggu.forEach((s) => {
    const d   = new Date(s.tanggal)
    const idx = d.getDay() === 0 ? 6 : d.getDay() - 1
    perHari[idx]++
  })

  const maxHari = Math.max(...perHari, 1)

  return {
    totalMingguIni: setoranMinggu.length,
    alQuranMinggu:  setoranMinggu.filter((s) => s.tipe === 'AL_QURAN').length,
    praTahsinMinggu:setoranMinggu.filter((s) => s.tipe === 'PRA_TAHSIN').length,
    totalSantri,
    perHari,
    maxHari,
    setoranTerbaru,
  }
}

// ── Komponen bar chart ringan ─────────────────────────────────────────────────
function BarChart({ perHari, maxHari }: { perHari: number[]; maxHari: number }) {
  const today = new Date().getDay()
  const todayIdx = today === 0 ? 6 : today - 1

  return (
    <div className="flex items-end gap-1.5 h-24">
      {perHari.map((count, i) => {
        const pct     = Math.round((count / maxHari) * 100)
        const isToday = i === todayIdx
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-slate-400 font-medium">{count > 0 ? count : ''}</span>
            <div className="w-full rounded-t-lg bg-slate-100 relative overflow-hidden" style={{ height: '64px' }}>
              <div
                className={`absolute bottom-0 w-full rounded-t-lg transition-all ${isToday ? 'bg-amber-400' : 'bg-blue-400'}`}
                style={{ height: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
              />
            </div>
            <span className={`text-[10px] font-semibold ${isToday ? 'text-amber-500' : 'text-slate-400'}`}>
              {HARI[i]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function setoranLabel(s: {
  tipe: string; surah: string | null; ayatMulai: number | null; ayatSelesai: number | null;
  kitab: { nama: string } | null; halamanMulai: number | null; halamanSelesai: number | null;
}): string {
  if (s.tipe === 'AL_QURAN' && s.surah) return `${s.surah} ${s.ayatMulai}–${s.ayatSelesai}`
  if (s.tipe === 'PRA_TAHSIN' && s.kitab) return `${s.kitab.nama} hal. ${s.halamanMulai}–${s.halamanSelesai}`
  return '—'
}

// ── Halaman ───────────────────────────────────────────────────────────────────
export default async function PengajarDashboardPage() {
  const session = await getSession()
  const data    = await getDashboardData(session!.id)

  const stats = [
    { label: 'Setoran Minggu Ini', value: data.totalMingguIni,    icon: BookMarkedIcon,    color: 'text-blue-600   bg-blue-100'    },
    { label: "Al-Qur'an",          value: data.alQuranMinggu,      icon: TrendingUpIcon,    color: 'text-violet-600 bg-violet-100'  },
    { label: 'Pra-Tahsin',         value: data.praTahsinMinggu,    icon: BookMarkedIcon,    color: 'text-amber-600  bg-amber-100'   },
    { label: 'Total Santri',       value: data.totalSantri,        icon: UsersIcon,         color: 'text-emerald-600 bg-emerald-100'},
  ]

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800">
          Selamat datang, {session?.nama} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Ringkasan aktivitas minggu berjalan</p>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-xl mb-2 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-extrabold text-slate-800">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar chart */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
            <TrendingUpIcon className="w-4 h-4" />
            Setoran per Hari — Minggu Ini
            <span className="ml-auto text-xs font-normal text-slate-400">
              Kolom hari ini berwarna amber
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <BarChart perHari={data.perHari} maxHari={data.maxHari} />
        </CardContent>
      </Card>

      {/* Setoran terbaru */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-sm text-slate-600">5 Setoran Terakhir</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {data.setoranTerbaru.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Belum ada setoran.</p>
          ) : (
            <div className="space-y-2">
              {data.setoranTerbaru.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    s.tipe === 'AL_QURAN' ? 'bg-violet-400' : 'bg-amber-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{s.santri.nama}</p>
                    <p className="text-xs text-slate-400">{setoranLabel(s)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {s.nilai && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-medium">
                        {s.nilai}
                      </span>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(s.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
