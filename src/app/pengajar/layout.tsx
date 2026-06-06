import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import PengajarSidebar from '@/components/PengajarSidebar'
import { Toaster } from '@/components/ui/sonner'

export default async function PengajarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/login?reason=unauthenticated')

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <PengajarSidebar nama={session.nama} peran={session.peran} />
      <main className="flex-1 min-w-0 p-4 lg:p-6">{children}</main>
      <Toaster richColors position="top-right" />
    </div>
  )
}
