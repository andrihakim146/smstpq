import Link from 'next/link'
import { ArrowLeftIcon, BellIcon, BookOpenIcon, SearchIcon, ShieldCheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import NisSearch from '@/components/NisSearch'

export const metadata = {
  title: 'Panduan Wali Murid — SMSTPQ',
  description: 'Cara memantau perkembangan hafalan, absensi, dan catatan santri TPQ menggunakan NIS.',
}

const steps = [
  {
    icon: SearchIcon,
    title: 'Dapatkan NIS Anak',
    desc: 'NIS (Nomor Induk Santri) adalah kode 8 digit angka. Minta kepada pengajar atau admin TPQ tempat anak belajar.',
    example: 'Contoh: 20260001',
  },
  {
    icon: BookOpenIcon,
    title: 'Cari & Buka Halaman Santri',
    desc: 'Masukkan NIS di kolom pencarian di bawah atau di halaman beranda, lalu tekan Cari. Anda akan diarahkan ke halaman detail santri.',
    example: 'Tidak perlu login — cukup NIS yang valid.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Pantau Setoran, Catatan & Absensi',
    desc: 'Di halaman detail santri, gunakan tab Setoran, Catatan, dan Absensi untuk melihat perkembangan anak secara lengkap.',
    example: 'Data diperbarui setiap kali pengajar mencatat.',
  },
  {
    icon: BellIcon,
    title: 'Aktifkan Notifikasi (Opsional)',
    desc: 'Tekan tombol "Aktifkan Notifikasi" di halaman santri agar Anda mendapat pemberitahuan saat ada setoran atau catatan baru.',
    example: 'Hanya berfungsi di browser yang mendukung Web Push.',
  },
]

const faqs = [
  {
    q: 'Apakah wali murid perlu login?',
    a: 'Tidak. Wali murid cukup memasukkan NIS 8 digit anak untuk melihat data. Login hanya untuk pengajar dan admin.',
  },
  {
    q: 'NIS saya tidak ditemukan, apa yang harus dilakukan?',
    a: 'Pastikan NIS yang dimasukkan benar (8 digit angka). Jika masih gagal, hubungi pengajar atau admin TPQ.',
  },
  {
    q: 'Bagaimana cara membagikan progres ke keluarga?',
    a: 'Di halaman detail santri, gunakan tombol "Bagikan ke Wali via WhatsApp" untuk mengirim ringkasan setoran.',
  },
]

export default function PanduanPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-blue-600">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm shadow">
              📖
            </div>
            <span className="text-slate-800">SMSTPQ</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="rounded-full text-slate-500 gap-1.5">
              <ArrowLeftIcon className="w-4 h-4" />
              Beranda
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 space-y-10 w-full">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-extrabold text-slate-800">Panduan Wali Murid</h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-lg mx-auto">
            Cara memantau perkembangan hafalan, absensi, dan catatan anak di TPQ —
            tanpa perlu login, cukup dengan NIS 8 digit.
          </p>
        </div>

        {/* Langkah-langkah */}
        <div className="space-y-4">
          {steps.map(({ icon: Icon, title, desc, example }, i) => (
            <Card key={title} className="rounded-3xl border-slate-100 shadow-sm">
              <CardContent className="p-5 flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-extrabold text-sm">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-blue-500 shrink-0" />
                    <h2 className="font-bold text-slate-800">{title}</h2>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                  <p className="text-xs text-blue-500 mt-1.5 font-medium">{example}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Coba langsung */}
        <Card className="rounded-3xl border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-extrabold text-slate-800 text-center">Coba Sekarang</h2>
            <p className="text-sm text-slate-500 text-center">
              Masukkan NIS anak di bawah ini untuk langsung melihat halaman detail santri.
            </p>
            <NisSearch />
          </CardContent>
        </Card>

        {/* FAQ */}
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold text-slate-800 text-center">Pertanyaan Umum</h2>
          {faqs.map(({ q, a }) => (
            <Card key={q} className="rounded-2xl border-slate-100 shadow-sm">
              <CardContent className="p-5">
                <p className="font-semibold text-slate-700 text-sm mb-1">{q}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA login pengajar */}
        <div className="text-center pb-6">
          <p className="text-xs text-slate-400 mb-3">Anda pengajar atau admin TPQ?</p>
          <Link href="/login">
            <Button className="rounded-2xl bg-amber-400 hover:bg-amber-500 text-white font-semibold px-8">
              Login Pengajar
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
