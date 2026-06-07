import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getSessionFromHeaders } from '@/lib/auth-server'
import { decryptBackup, validatePassword } from '@/lib/backup-crypto'
import { logBackupRestore, logApiError } from '@/lib/logger'
import { getIp } from '@/lib/get-ip'

export const maxDuration = 60

type RestoreMode = 'skip' | 'overwrite'

// ── Tipe data dari backup payload ─────────────────────────────────────────────
interface BackupPayload {
  createdAt: string
  data: {
    pengajar: Record<string, unknown>[]
    kelas:    Record<string, unknown>[]
    kitab:    Record<string, unknown>[]
    santri:   Record<string, unknown>[]
    setoran:  Record<string, unknown>[]
    catatan:  Record<string, unknown>[]
    absensi:  Record<string, unknown>[]
  }
}

// ── Helper: konversi field tanggal dari string ke Date ────────────────────────
function toDate(v: unknown): Date | null {
  if (!v) return null
  return new Date(v as string)
}

// ── Helper: insert batch dengan createMany ────────────────────────────────────
const BATCH = 200

async function batchInsert<T>(
  items:    T[],
  inserter: (chunk: T[]) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH) {
    await inserter(items.slice(i, i + BATCH))
  }
}

// ── POST /api/admin/backup/restore ────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const ip    = getIp(request)
  const check = requireAdmin(request)
  if (check) return check

  // Parse multipart form
  let formData: FormData
  try { formData = await request.formData() }
  catch { return NextResponse.json({ error: 'Gagal membaca form data.' }, { status: 400 }) }

  const file     = formData.get('file')     as File   | null
  const password = formData.get('password') as string | null
  const mode     = (formData.get('mode')    as string | null) ?? 'skip'

  if (!file)     return NextResponse.json({ error: 'File backup wajib diunggah.'  }, { status: 422 })
  if (!password) return NextResponse.json({ error: 'Password wajib diisi.'         }, { status: 422 })

  const pwError = validatePassword(password)
  if (pwError)   return NextResponse.json({ error: pwError }, { status: 422 })

  if (mode !== 'skip' && mode !== 'overwrite') {
    return NextResponse.json({ error: 'Mode harus "skip" atau "overwrite".' }, { status: 422 })
  }

  // ── Baca & dekripsi file ───────────────────────────────────────────────────
  const ciphertext = await file.text()
  const result     = decryptBackup(ciphertext, password)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })

  let payload: BackupPayload
  try { payload = JSON.parse(result.plaintext) as BackupPayload }
  catch { return NextResponse.json({ error: 'File backup rusak (JSON tidak valid setelah dekripsi).' }, { status: 422 }) }

  if (!payload?.data) {
    return NextResponse.json({ error: 'Format backup tidak dikenali.' }, { status: 422 })
  }

  const d = payload.data
  const stats: Record<string, number> = {
    pengajar: 0, kelas: 0, kitab: 0, santri: 0,
    setoran: 0, catatan: 0, absensi: 0,
  }

  // ── Restore dalam urutan yang benar (FK-safe) ─────────────────────────────
  try {
    // 1. Pengajar
    if (d.pengajar?.length) {
      await batchInsert(d.pengajar, async (chunk) => {
        if (mode === 'skip') {
          const res = await prisma.pengajar.createMany({
            data: chunk.map((p) => ({
              id:        p.id        as string,
              nama:      p.nama      as string,
              pinHash:   p.pinHash   as string,
              peran:     p.peran     as 'ADMIN' | 'PENGAJAR',
              noWa:      (p.noWa as string | null | undefined) ?? null,
              isActive:  p.isActive  as boolean ?? true,
              createdAt: toDate(p.createdAt) ?? new Date(),
            })),
            skipDuplicates: true,
          })
          stats.pengajar += res.count
        } else {
          for (const p of chunk) {
            await prisma.pengajar.upsert({
              where:  { id: p.id as string },
              create: {
                id: p.id as string, nama: p.nama as string, pinHash: p.pinHash as string,
                peran: p.peran as 'ADMIN' | 'PENGAJAR', noWa: (p.noWa as string | null | undefined) ?? null,
                isActive: p.isActive as boolean ?? true, createdAt: toDate(p.createdAt) ?? new Date(),
              },
              update: {
                nama: p.nama as string, pinHash: p.pinHash as string,
                peran: p.peran as 'ADMIN' | 'PENGAJAR', noWa: (p.noWa as string | null | undefined) ?? null,
                isActive: p.isActive as boolean ?? true,
              },
            })
            stats.pengajar++
          }
        }
      })
    }

    // 2. Kelas
    if (d.kelas?.length) {
      await batchInsert(d.kelas, async (chunk) => {
        if (mode === 'skip') {
          const res = await prisma.kelas.createMany({
            data:           chunk.map((k) => ({ id: k.id as string, nama: k.nama as string })),
            skipDuplicates: true,
          })
          stats.kelas += res.count
        } else {
          for (const k of chunk) {
            await prisma.kelas.upsert({
              where:  { id: k.id as string },
              create: { id: k.id as string, nama: k.nama as string },
              update: { nama: k.nama as string },
            })
            stats.kelas++
          }
        }
      })
    }

    // 3. Kitab
    if (d.kitab?.length) {
      await batchInsert(d.kitab, async (chunk) => {
        if (mode === 'skip') {
          const res = await prisma.kitab.createMany({
            data: chunk.map((k) => ({
              id: k.id as string, nama: k.nama as string,
              isActive:  k.isActive  as boolean ?? true,
              createdAt: toDate(k.createdAt) ?? new Date(),
            })),
            skipDuplicates: true,
          })
          stats.kitab += res.count
        } else {
          for (const k of chunk) {
            await prisma.kitab.upsert({
              where:  { id: k.id as string },
              create: {
                id: k.id as string, nama: k.nama as string,
                isActive: k.isActive as boolean ?? true, createdAt: toDate(k.createdAt) ?? new Date(),
              },
              update: { nama: k.nama as string, isActive: k.isActive as boolean ?? true },
            })
            stats.kitab++
          }
        }
      })
    }

    // 4. Santri
    if (d.santri?.length) {
      await batchInsert(d.santri, async (chunk) => {
        if (mode === 'skip') {
          const res = await prisma.santri.createMany({
            data: chunk.map((s) => ({
              id:                 s.id   as string,
              nis:                s.nis  as string,
              nama:               s.nama as string,
              kelasId:            s.kelasId            as string | null ?? null,
              targetPembelajaran: s.targetPembelajaran as string | null ?? null,
              deadlineTarget:     toDate(s.deadlineTarget),
              noWaWali:           s.noWaWali           as string | null ?? null,
              isActive:           s.isActive           as boolean ?? true,
              createdAt:          toDate(s.createdAt) ?? new Date(),
            })),
            skipDuplicates: true,
          })
          stats.santri += res.count
        } else {
          for (const s of chunk) {
            await prisma.santri.upsert({
              where:  { id: s.id as string },
              create: {
                id: s.id as string, nis: s.nis as string, nama: s.nama as string,
                kelasId: s.kelasId as string | null ?? null,
                targetPembelajaran: s.targetPembelajaran as string | null ?? null,
                deadlineTarget: toDate(s.deadlineTarget),
                noWaWali: s.noWaWali as string | null ?? null,
                isActive: s.isActive as boolean ?? true, createdAt: toDate(s.createdAt) ?? new Date(),
              },
              update: {
                nama: s.nama as string, kelasId: s.kelasId as string | null ?? null,
                targetPembelajaran: s.targetPembelajaran as string | null ?? null,
                deadlineTarget: toDate(s.deadlineTarget),
                noWaWali: s.noWaWali as string | null ?? null, isActive: s.isActive as boolean ?? true,
              },
            })
            stats.santri++
          }
        }
      })
    }

    // 5. Setoran
    if (d.setoran?.length) {
      await batchInsert(d.setoran, async (chunk) => {
        if (mode === 'skip') {
          const res = await prisma.setoran.createMany({
            data: chunk.map((s) => ({
              id:             s.id         as string,
              santriId:       s.santriId   as string,
              pengajarId:     s.pengajarId as string,
              tanggal:        toDate(s.tanggal) ?? new Date(),
              tipe:           s.tipe as 'AL_QURAN' | 'PRA_TAHSIN',
              surah:          s.surah          as string | null ?? null,
              ayatMulai:      s.ayatMulai      as number | null ?? null,
              ayatSelesai:    s.ayatSelesai    as number | null ?? null,
              kategori:       s.kategori       as 'ZIYADAH' | 'MUROJAAH' | null ?? null,
              kitabId:        s.kitabId        as string | null ?? null,
              halamanMulai:   s.halamanMulai   as number | null ?? null,
              halamanSelesai: s.halamanSelesai as number | null ?? null,
              nilai:          s.nilai          as string | null ?? null,
            })),
            skipDuplicates: true,
          })
          stats.setoran += res.count
        } else {
          for (const s of chunk) {
            await prisma.setoran.upsert({
              where:  { id: s.id as string },
              create: {
                id: s.id as string, santriId: s.santriId as string, pengajarId: s.pengajarId as string,
                tanggal: toDate(s.tanggal) ?? new Date(), tipe: s.tipe as 'AL_QURAN' | 'PRA_TAHSIN',
                surah: s.surah as string | null ?? null, ayatMulai: s.ayatMulai as number | null ?? null,
                ayatSelesai: s.ayatSelesai as number | null ?? null,
                kategori: s.kategori as 'ZIYADAH' | 'MUROJAAH' | null ?? null,
                kitabId: s.kitabId as string | null ?? null,
                halamanMulai: s.halamanMulai as number | null ?? null,
                halamanSelesai: s.halamanSelesai as number | null ?? null,
                nilai: s.nilai as string | null ?? null,
              },
              update: {
                nilai: s.nilai as string | null ?? null,
                kategori: s.kategori as 'ZIYADAH' | 'MUROJAAH' | null ?? null,
              },
            })
            stats.setoran++
          }
        }
      })
    }

    // 6. Catatan
    if (d.catatan?.length) {
      await batchInsert(d.catatan, async (chunk) => {
        if (mode === 'skip') {
          const res = await prisma.catatan.createMany({
            data: chunk.map((c) => ({
              id:         c.id         as string,
              santriId:   c.santriId   as string,
              pengajarId: c.pengajarId as string,
              isi:        c.isi        as string,
              createdAt:  toDate(c.createdAt) ?? new Date(),
            })),
            skipDuplicates: true,
          })
          stats.catatan += res.count
        } else {
          for (const c of chunk) {
            await prisma.catatan.upsert({
              where:  { id: c.id as string },
              create: {
                id: c.id as string, santriId: c.santriId as string,
                pengajarId: c.pengajarId as string, isi: c.isi as string,
                createdAt: toDate(c.createdAt) ?? new Date(),
              },
              update: { isi: c.isi as string },
            })
            stats.catatan++
          }
        }
      })
    }

    // 7. Absensi
    if (d.absensi?.length) {
      await batchInsert(d.absensi, async (chunk) => {
        if (mode === 'skip') {
          const res = await prisma.absensi.createMany({
            data: chunk.map((a) => ({
              id:         a.id       as string,
              santriId:   a.santriId as string,
              tanggal:    toDate(a.tanggal) ?? new Date(),
              status:     a.status as 'HADIR' | 'TIDAK_HADIR' | 'IZIN' | 'SAKIT',
              keterangan: a.keterangan as string | null ?? null,
              createdAt:  toDate(a.createdAt) ?? new Date(),
            })),
            skipDuplicates: true,
          })
          stats.absensi += res.count
        } else {
          for (const a of chunk) {
            await prisma.absensi.upsert({
              where:  { santriId_tanggal: { santriId: a.santriId as string, tanggal: toDate(a.tanggal)! } },
              create: {
                id: a.id as string, santriId: a.santriId as string,
                tanggal: toDate(a.tanggal) ?? new Date(),
                status: a.status as 'HADIR' | 'TIDAK_HADIR' | 'IZIN' | 'SAKIT',
                keterangan: a.keterangan as string | null ?? null,
                createdAt: toDate(a.createdAt) ?? new Date(),
              },
              update: {
                status: a.status as 'HADIR' | 'TIDAK_HADIR' | 'IZIN' | 'SAKIT',
                keterangan: a.keterangan as string | null ?? null,
              },
            })
            stats.absensi++
          }
        }
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal menyimpan data.'
    return NextResponse.json({ error: `Restore gagal: ${msg}` }, { status: 500 })
  }

  // Catat aktivitas
  const session = getSessionFromHeaders(request)
  if (session) {
    logBackupRestore({ pengajarId: session.id, ip, mode, tables: stats })
    const detail = `Restore (${mode}) dari backup ${payload.createdAt}: ` +
      Object.entries(stats).map(([k, v]) => `${k}=${v}`).join(', ')
    await prisma.logAktivitas.create({
      data: {
        pengajarId: session.id,
        aksi:       'BACKUP_RESTORE',
        detail,
        ip,
      },
    })
  }

  return NextResponse.json({
    success:   true,
    mode,
    backupDate: payload.createdAt,
    imported:   stats,
  })
}
