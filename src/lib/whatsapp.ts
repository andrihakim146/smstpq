/** Shape data setoran minimal yang dibutuhkan untuk pesan WA. */
export interface SetoranForWA {
  tanggal:        string | Date
  tipe:           string
  surah?:         string | null
  ayatMulai?:     number | null
  ayatSelesai?:   number | null
  kategori?:      string | null
  kitabNama?:     string | null
  halamanMulai?:  number | null
  halamanSelesai?:number | null
  nilai?:         string | null
}

export interface SantriForWA {
  nama:      string
  nis:       string
  noWaWali?: string | null
}

/** Buat teks ringkas detail setoran (satu baris). */
function detailSetoran(s: SetoranForWA): string {
  if (s.tipe === 'AL_QURAN' && s.surah) {
    const kat = s.kategori ? ` (${s.kategori})` : ''
    return `*${s.surah}* ayat ${s.ayatMulai}–${s.ayatSelesai}${kat}`
  }
  if (s.tipe === 'PRA_TAHSIN' && s.kitabNama) {
    return `*${s.kitabNama}* hal. ${s.halamanMulai}–${s.halamanSelesai}`
  }
  return '—'
}

/**
 * Buat teks pesan WhatsApp untuk laporan setoran ke wali santri.
 * @returns Teks pesan (belum di-encode).
 */
export function generateWhatsAppMessage(
  setoran: SetoranForWA,
  santri:  SantriForWA,
  baseUrl: string,
): string {
  const tgl    = new Date(setoran.tanggal).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const tipe   = setoran.tipe === 'AL_QURAN' ? "Al-Qur'an" : 'Pra-Tahsin'
  const detail = detailSetoran(setoran)
  const nilai  = setoran.nilai ? `⭐ Nilai: *${setoran.nilai}*\n` : ''
  const url    = `${baseUrl}/santri/${santri.nis}`

  return (
    `Assalamu'alaikum, Bapak/Ibu wali dari *${santri.nama}* (NIS: ${santri.nis}) 🙏\n\n` +
    `📖 *Laporan Setoran ${tipe}*\n` +
    `📅 Tanggal: ${tgl}\n` +
    `📚 Detail: ${detail}\n` +
    `${nilai}` +
    `\nLihat rekap lengkap santri di:\n${url}\n\n` +
    `_Terima kasih – SMSTPQ_`
  )
}

/**
 * Buat URL wa.me siap pakai.
 * Nomor WA dibersihkan dari karakter non-digit dan diawali kode negara.
 */
export function buildWhatsAppUrl(
  setoran: SetoranForWA,
  santri:  SantriForWA,
  baseUrl: string,
): string | null {
  if (!santri.noWaWali) return null

  // Normalkan nomor: hapus spasi/tanda, ganti awalan 0 → 62
  const rawNo = santri.noWaWali.replace(/\D/g, '')
  const no    = rawNo.startsWith('0') ? `62${rawNo.slice(1)}` : rawNo

  const text = generateWhatsAppMessage(setoran, santri, baseUrl)
  return `https://wa.me/${no}?text=${encodeURIComponent(text)}`
}
