export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users, GraduationCap, BookOpen, School,
  ClipboardList, TrendingUp,
} from 'lucide-react'

function weekStart(): Date {
  const now  = new Date()
  const day  = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const mon  = new Date(now)
  mon.setDate(diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

async function getAdminStats() {
  const mon = weekStart()
  const [
    totalSantriAktif,
    totalPengajar,
    totalKelas,
    setoranMinggu,
    santriLulus,
    santriKeluar,
    logTerbaru,
  ] = await Promise.all([
    prisma.santri.count({ where: { status: 'AKTIF', isActive: true } }),
    prisma.pengajar.count({ where: { isActive: true } }),
    prisma.kelas.count(),
    prisma.setoran.count({ where: { tanggal: { gte: mon } } }),
    prisma.santri.count({ where: { status: 'LULUS' } }),
    prisma.santri.count({ where: { status: { in: ['PINDAH', 'KELUAR'] } } }),
    prisma.logAktivitas.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true, aksi: true, detail: true, createdAt: true,
        pengajar: { select: { nama: true } },
      },
    }),
  ])

  return {
    totalSantriAktif,
    totalPengajar,
    totalKelas,
    setoranMinggu,
    santriLulus,
    santriKeluar,
    logTerbaru,
  }
}

export default async function AdminDashboardPage() {
  const session = await getSession()
  const stats   = await getAdminStats().catch(() => null)

  const cards = stats ? [
    { label: 'Santri Aktif',    value: stats.totalSantriAktif, icon: GraduationCap, color: 'bg-blue-100 text-blue-600' },
    { label: 'Pengajar Aktif',  value: stats.totalPengajar,    icon: Users,         color: 'bg-violet-100 text-violet-600' },
    { label: 'Kelas',           value: stats.totalKelas,       icon: School,        color: 'bg-amber-100 text-amber-600' },
    { label: 'Setoran Minggu',  value: stats.setoranMinggu,  icon: BookOpen,      color: 'bg-emerald-100 text-emerald-600' },
  ] : []

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Dashboard Admin</h1>
        <p className="text-slate-500 text-sm">
          Selamat datang, <span className="font-semibold text-blue-600">{session?.nama}</span>
        </p>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats ? cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-5">
              <div className={`inline-flex p-2.5 rounded-2xl ${color} mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-extrabold text-slate-800">{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        )) : (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-3xl bg-slate-100 animate-pulse" />
          ))
        )}
      </div>

      {/* Ringkasan alumni / keluar */}
      {stats && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-800">{stats.santriLulus}</p>
                <p className="text-sm text-slate-500">Santri Lulus</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-800">{stats.santriKeluar}</p>
                <p className="text-sm text-slate-500">Pindah / Keluar</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Menu cepat */}
      <Card className="rounded-3xl border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-600">Menu Cepat</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2 pb-5">
          {[
            { href: '/admin/santri',   label: 'Santri',   icon: GraduationCap },
            { href: '/admin/pengajar', label: 'Pengajar', icon: Users },
            { href: '/admin/kelas',    label: 'Kelas',    icon: School },
            { href: '/admin/log',      label: 'Log',      icon: ClipboardList },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-sm font-medium transition-colors"
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Log terbaru */}
      {stats && stats.logTerbaru.length > 0 && (
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm text-slate-600">Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2">
            {stats.logTerbaru.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700">{log.aksi}</p>
                  <p className="text-xs text-slate-400 truncate">{log.detail}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-500">{log.pengajar?.nama ?? 'Sistem'}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(log.createdAt).toLocaleString('id-ID', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
