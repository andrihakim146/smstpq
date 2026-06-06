import { UsersIcon, BookOpenIcon, CheckCircle2Icon, BookMarkedIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Stats {
  totalSantri: number
  setoranMingguIni: { alQuran: number; praTahsin: number; total: number }
  kehadiran: { persentase: number; hadir: number; total: number }
}

const statItems = (s: Stats) => [
  {
    label:  'Total Santri',
    value:  s.totalSantri.toString(),
    sub:    'santri terdaftar aktif',
    icon:   UsersIcon,
    color:  'bg-blue-100 text-blue-600',
    border: 'border-blue-100',
  },
  {
    label:  'Setoran Minggu Ini',
    value:  s.setoranMingguIni.alQuran.toString(),
    sub:    `Al-Qur'an · ${s.setoranMingguIni.praTahsin} Pra-Tahsin`,
    icon:   BookMarkedIcon,
    color:  'bg-amber-100 text-amber-600',
    border: 'border-amber-100',
  },
  {
    label:  'Total Setoran',
    value:  s.setoranMingguIni.total.toString(),
    sub:    'setoran minggu berjalan',
    icon:   BookOpenIcon,
    color:  'bg-violet-100 text-violet-600',
    border: 'border-violet-100',
  },
  {
    label:  'Kehadiran',
    value:  s.kehadiran.total > 0 ? `${s.kehadiran.persentase}%` : '–',
    sub:    s.kehadiran.total > 0
              ? `${s.kehadiran.hadir} hadir dari ${s.kehadiran.total} (30 hari)`
              : 'Belum ada data absensi',
    icon:   CheckCircle2Icon,
    color:  'bg-emerald-100 text-emerald-600',
    border: 'border-emerald-100',
  },
]

export default function StatsCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems(stats).map(({ label, value, sub, icon: Icon, color, border }) => (
        <Card
          key={label}
          className={`rounded-3xl border ${border} shadow-sm hover:shadow-md transition-shadow`}
        >
          <CardContent className="p-5">
            <div className={`inline-flex p-2.5 rounded-2xl ${color} mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-extrabold text-slate-800 leading-none">{value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">{label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
