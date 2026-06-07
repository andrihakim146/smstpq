'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface PanelNavContextValue {
  closeNav: () => void
}

const PanelNavContext = createContext<PanelNavContextValue>({
  closeNav: () => {},
})

export function usePanelNav() {
  return useContext(PanelNavContext)
}

interface PanelShellProps {
  panelTitle: string
  sidebar:    React.ReactNode
  children:   React.ReactNode
}

export default function PanelShell({ panelTitle, sidebar, children }: PanelShellProps) {
  const [open, setOpen] = useState(false)
  const closeNav = useCallback(() => setOpen(false), [])

  return (
    <PanelNavContext.Provider value={{ closeNav }}>
      <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 bg-white border-b border-slate-100 shadow-sm shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(true)}
            className="rounded-xl h-9 w-9 p-0 text-slate-600"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800 text-sm truncate">{panelTitle}</p>
            <p className="text-[10px] text-slate-400">SMSTPQ</p>
          </div>
        </header>

        {/* Backdrop */}
        {open && (
          <button
            type="button"
            aria-label="Tutup menu"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 lg:static lg:z-auto lg:shrink-0',
            'transition-transform duration-200 ease-out',
            open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
        >
          {sidebar}
        </div>

        <main className="flex-1 min-w-0 p-4 sm:p-5 lg:p-8 overflow-x-auto">
          {children}
        </main>
      </div>
    </PanelNavContext.Provider>
  )
}

export function PanelSidebarClose() {
  const { closeNav } = usePanelNav()
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={closeNav}
      className="lg:hidden absolute top-4 right-3 h-8 w-8 p-0 rounded-full text-slate-400"
      aria-label="Tutup menu"
    >
      <X className="w-4 h-4" />
    </Button>
  )
}
