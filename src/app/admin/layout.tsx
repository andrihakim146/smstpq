import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import AdminSidebar from '@/components/AdminSidebar'
import PanelShell from '@/components/PanelShell'
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
    <>
      <PanelShell
        panelTitle="Panel Admin"
        sidebar={<AdminSidebar nama={session.nama} />}
      >
        {children}
      </PanelShell>
      <Toaster richColors position="top-center" />
    </>
  )
}
