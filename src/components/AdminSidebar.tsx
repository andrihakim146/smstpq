'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  LogOut,
  School,
  ClipboardList,
  FileDown,
  Archive,
  Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePanelNav, PanelSidebarClose } from '@/components/PanelShell'

const navItems = [
  { href: '/admin/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/pengajar',   label: 'Pengajar',   icon: Users },
  { href: '/admin/santri',     label: 'Santri',     icon: GraduationCap },
  { href: '/admin/kelas',      label: 'Kelas',      icon: School },
  { href: '/admin/kitab',      label: 'Kitab',      icon: BookOpen      },
  { href: '/admin/log',        label: 'Log Aktivitas', icon: ClipboardList },
  { href: '/admin/export',     label: 'Ekspor Data',   icon: FileDown      },
  { href: '/admin/retensi',    label: 'Retensi Data',  icon: Archive       },
  { href: '/admin/backup',     label: 'Backup & Restore', icon: Database   },
]

interface Props {
  nama: string
}

export default function AdminSidebar({ nama }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const { closeNav } = usePanelNav()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="relative w-64 max-w-[85vw] h-full lg:min-h-screen bg-white border-r border-slate-100 flex flex-col shadow-sm lg:shadow-none">
      <PanelSidebarClose />
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow">
            📖
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm leading-none">SMSTPQ</p>
            <p className="text-xs text-slate-400 mt-0.5">Panel Admin</p>
          </div>
        </div>
      </div>

      {/* Profil admin */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-blue-50">
          <div className="w-7 h-7 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 text-xs font-bold">
            {nama.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-800 truncate">{nama}</p>
            <p className="text-[10px] text-blue-500">Admin</p>
          </div>
        </div>
      </div>

      {/* Navigasi */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={closeNav}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-100">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-2xl"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </Button>
      </div>
    </aside>
  )
}
