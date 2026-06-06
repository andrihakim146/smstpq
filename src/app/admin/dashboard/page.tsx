import { getSession } from '@/lib/session'

export default async function AdminDashboardPage() {
  const session = await getSession()

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Dashboard Admin</h1>
      <p className="text-slate-500 text-sm">
        Selamat datang, <span className="font-semibold text-blue-600">{session?.nama}</span>
      </p>
    </div>
  )
}
