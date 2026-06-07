import { z } from 'zod'
import { optionalUuid, optionalDate } from '@/lib/zod-helpers'

const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v)

export const jenisKelaminSchema = z.preprocess(
  emptyToNull,
  z.enum(['LAKI_LAKI', 'PEREMPUAN']).nullable().optional(),
)

export const usiaSchema = z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return null
    const n = Number(v)
    return Number.isNaN(n) ? v : n
  },
  z.number().int().min(1).max(120).nullable().optional(),
)

export const nullableString = (max: number) =>
  z.preprocess(emptyToNull, z.string().max(max).nullable().optional())

export const santriBodySchema = z.object({
  nama:               z.string().min(1).max(200).trim(),
  kelasId:            optionalUuid.optional(),
  jenisKelamin:       jenisKelaminSchema,
  usia:               usiaSchema,
  namaWali:           nullableString(200),
  alamat:             nullableString(1000),
  targetPembelajaran: z.preprocess(emptyToNull, z.string().max(500).nullable().optional()),
  deadlineTarget:     optionalDate.optional(),
  noWaWali:           nullableString(20),
})

export const santriPatchSchema = santriBodySchema.partial().extend({
  status:        z.enum(['AKTIF', 'LULUS', 'PINDAH', 'KELUAR']).optional(),
  statusSejak:   optionalDate.optional(),
  statusCatatan: nullableString(500),
  isActive:      z.boolean().optional(),
})

export function santriProfileData(d: {
  jenisKelamin?: 'LAKI_LAKI' | 'PEREMPUAN' | null
  usia?: number | null
  namaWali?: string | null
  alamat?: string | null
  nama?: string
  kelasId?: string | null
  targetPembelajaran?: string | null
  deadlineTarget?: string | null
  noWaWali?: string | null
}) {
  return {
    ...(d.nama               !== undefined ? { nama: d.nama } : {}),
    ...(d.kelasId            !== undefined ? { kelasId: d.kelasId } : {}),
    ...(d.jenisKelamin       !== undefined ? { jenisKelamin: d.jenisKelamin } : {}),
    ...(d.usia               !== undefined ? { usia: d.usia } : {}),
    ...(d.namaWali           !== undefined ? { namaWali: d.namaWali } : {}),
    ...(d.alamat             !== undefined ? { alamat: d.alamat } : {}),
    ...(d.targetPembelajaran !== undefined ? { targetPembelajaran: d.targetPembelajaran } : {}),
    ...(d.deadlineTarget     !== undefined ? {
      deadlineTarget: d.deadlineTarget ? new Date(d.deadlineTarget) : null,
    } : {}),
    ...(d.noWaWali           !== undefined ? { noWaWali: d.noWaWali } : {}),
  }
}
