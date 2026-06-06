import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import AdminSidebar from '@/components/AdminSidebar'
import { Toaster } from '@/components/ui/sonner'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) redirect('/login?reason=unauthenticated')
  if (session.peran !== 'ADMIN') redirect('/pengajar/dashboard')

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar nama={session.nama} />

      <main className="flex-1 min-w-0 p-6 lg:p-8">
        {children}
      </main>

      <Toaster richColors position="top-right" />
    </div>
  )
}
