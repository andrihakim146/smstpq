import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import PengajarSidebar from '@/components/PengajarSidebar'
import PanelShell from '@/components/PanelShell'
import { Toaster } from '@/components/ui/sonner'

export default async function PengajarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/login?reason=unauthenticated')

  return (
    <>
      <PanelShell
        panelTitle="Portal Pengajar"
        sidebar={<PengajarSidebar nama={session.nama} peran={session.peran} />}
      >
        {children}
      </PanelShell>
      <Toaster richColors position="top-center" />
    </>
  )
}
