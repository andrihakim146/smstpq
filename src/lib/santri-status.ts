export type StatusSantri = 'AKTIF' | 'LULUS' | 'PINDAH' | 'KELUAR'

export const STATUS_SANTRI_LABEL: Record<StatusSantri, string> = {
  AKTIF:  'Aktif',
  LULUS:  'Lulus',
  PINDAH: 'Pindah',
  KELUAR: 'Keluar',
}

export const STATUS_SANTRI_BADGE: Record<StatusSantri, string> = {
  AKTIF:  'bg-emerald-100 text-emerald-700',
  LULUS:  'bg-blue-100 text-blue-700',
  PINDAH: 'bg-amber-100 text-amber-700',
  KELUAR: 'bg-slate-100 text-slate-500',
}

/** Santri masih dihitung aktif untuk input setoran/absensi */
export function isSantriAktif(status: StatusSantri): boolean {
  return status === 'AKTIF'
}
