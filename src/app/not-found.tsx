import Link from 'next/link'
import { SearchXIcon } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <SearchXIcon className="w-8 h-8 text-amber-600" />
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-black text-slate-800 mb-1">404</h1>
          <p className="text-slate-500 text-sm">Halaman yang Anda cari tidak ditemukan.</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 transition-colors"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  )
}
