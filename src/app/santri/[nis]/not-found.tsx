import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function SantriNotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Santri Tidak Ditemukan</h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          NIS yang Anda masukkan tidak terdaftar atau tidak aktif.
          Pastikan NIS sudah benar (8 digit) dan hubungi pengajar jika masih bermasalah.
        </p>
        <Link href="/">
          <Button className="rounded-2xl bg-blue-500 hover:bg-blue-600 text-white px-8">
            Cari Ulang
          </Button>
        </Link>
      </div>
    </div>
  )
}
