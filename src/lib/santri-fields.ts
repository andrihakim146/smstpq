export type JenisKelamin = 'LAKI_LAKI' | 'PEREMPUAN'

export const JENIS_KELAMIN_LABEL: Record<JenisKelamin, string> = {
  LAKI_LAKI: 'Laki-laki',
  PEREMPUAN: 'Perempuan',
}

/** Field yang dikembalikan API admin santri. */
export const santriAdminSelect = {
  id:                 true,
  nis:                true,
  nama:               true,
  jenisKelamin:       true,
  usia:               true,
  namaWali:           true,
  alamat:             true,
  isActive:           true,
  status:             true,
  statusSejak:        true,
  statusCatatan:      true,
  targetPembelajaran: true,
  deadlineTarget:     true,
  noWaWali:           true,
  createdAt:          true,
  kelas:              { select: { id: true, nama: true } },
  _count:             { select: { setoran: true } },
} as const
