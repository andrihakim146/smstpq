'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, BookMarked, CalendarCheck,
  MessageSquare, LogOut, ShieldIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/pengajar/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/pengajar/setoran',   label: 'Setoran Baru', icon: BookMarked      },
  { href: '/pengajar/absensi',   label: 'Absensi',      icon: CalendarCheck   },
  { href: '/pengajar/catatan',   label: 'Catatan',      icon: MessageSquare   },
]

export default function PengajarSidebar({
  nama,
  peran,
}: {
  nama:  string
  peran: 'ADMIN' | 'PENGAJAR'
}) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-100 flex flex-col min-h-screen shadow-sm">
      {/* Brand */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm shadow">📖</div>
          <div>
            <p className="font-bold text-slate-800 text-sm leading-none">SMSTPQ</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Portal Pengajar</p>
          </div>
        </div>
      </div>

      {/* Profil */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-blue-50">
          <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 text-xs font-bold">
            {nama.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-blue-800 truncate">{nama}</p>
            <p className="text-[10px] text-blue-500 flex items-center gap-1">
              {peran === 'ADMIN' && <ShieldIcon className="w-2.5 h-2.5" />}
              {peran === 'ADMIN' ? 'Admin' : 'Pengajar'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        {peran === 'ADMIN' && (
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium text-slate-500 hover:bg-slate-100 mt-2 border-t border-slate-100 pt-3"
          >
            <ShieldIcon className="w-4 h-4 shrink-0" />
            Panel Admin
          </Link>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-100">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl text-sm"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </Button>
      </div>
    </aside>
  )
}
