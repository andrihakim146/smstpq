import 'dotenv/config'
import { PrismaClient } from '../generated/client/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// Format NIS: YYYY + 4-digit urutan (contoh: 20260001)
function generateNIS(tahun: number, urutan: number): string {
  return `${tahun}${String(urutan).padStart(4, '0')}`
}

// UUID statis agar seed idempotent
const ID = {
  admin:     '00000000-0000-0000-0000-000000000001',
  pengajar1: '00000000-0000-0000-0000-000000000002',
  pengajar2: '00000000-0000-0000-0000-000000000003',
  kelasA:    '00000000-0000-0000-0000-000000000011',
  kelasB:    '00000000-0000-0000-0000-000000000012',
}

async function main() {
  console.log('🌱 Memulai seeding database SMSTPQ...\n')

  // ---------- 1. HASH PIN ----------
  const pinHash = await bcrypt.hash('123456', 10)

  // ---------- 2. PENGAJAR ----------
  const admin = await prisma.pengajar.upsert({
    where: { id: ID.admin },
    update: {},
    create: {
      id:       ID.admin,
      nama:     'Ahmad Fauzi',
      pinHash,
      peran:    'ADMIN',
      isActive: true,
    },
  })

  const pengajar1 = await prisma.pengajar.upsert({
    where: { id: ID.pengajar1 },
    update: {},
    create: {
      id:       ID.pengajar1,
      nama:     'Budi Santoso',
      pinHash,
      peran:    'PENGAJAR',
      isActive: true,
    },
  })

  const pengajar2 = await prisma.pengajar.upsert({
    where: { id: ID.pengajar2 },
    update: {},
    create: {
      id:       ID.pengajar2,
      nama:     'Siti Rahayu',
      pinHash,
      peran:    'PENGAJAR',
      isActive: true,
    },
  })

  console.log('✅ Pengajar dibuat:')
  console.log(`   - ${admin.nama}     (${admin.peran})`)
  console.log(`   - ${pengajar1.nama} (${pengajar1.peran})`)
  console.log(`   - ${pengajar2.nama}  (${pengajar2.peran})`)

  // ---------- 3. KELAS ----------
  const kelasA = await prisma.kelas.upsert({
    where: { id: ID.kelasA },
    update: {},
    create: {
      id:   ID.kelasA,
      nama: 'Kelas A',
    },
  })

  const kelasB = await prisma.kelas.upsert({
    where: { id: ID.kelasB },
    update: {},
    create: {
      id:   ID.kelasB,
      nama: 'Kelas B',
    },
  })

  console.log('\n✅ Kelas dibuat:')
  console.log(`   - ${kelasA.nama} (Pengajar: ${pengajar1.nama})`)
  console.log(`   - ${kelasB.nama} (Pengajar: ${pengajar2.nama})`)

  // ---------- 4. KITAB REFERENSI ----------
  const kitabList = [
    "Iqro 1",
    "Iqro 2",
    "Tilawati 1",
    "Yanbu'a 1",
    "Qiroati 2",
  ]

  // Gunakan upsert per nama agar seed idempoten (aman dijalankan berulang)
  for (const nama of kitabList) {
    const existing = await prisma.kitab.findFirst({ where: { nama } })
    if (!existing) {
      await prisma.kitab.create({ data: { nama, isActive: true } })
    }
  }

  console.log(`\n✅ Kitab referensi dibuat: ${kitabList.join(', ')}`)

  // ---------- 5. SANTRI ----------
  const tahun = new Date().getFullYear()

  const dataSantri = [
    { nama: 'Muhammad Rizki', kelasId: kelasA.id, urutan: 1 },
    { nama: 'Abdullah Hafidz', kelasId: kelasA.id, urutan: 2 },
    { nama: 'Fatimah Zahra',   kelasId: kelasA.id, urutan: 3 },
    { nama: 'Aisyah Putri',    kelasId: kelasB.id, urutan: 4 },
    { nama: 'Umar Farouq',     kelasId: kelasB.id, urutan: 5 },
  ]

  console.log('\n✅ Santri dibuat:')
  for (const s of dataSantri) {
    const nis       = generateNIS(tahun, s.urutan)
    const namaKelas = s.kelasId === kelasA.id ? kelasA.nama : kelasB.nama

    await prisma.santri.upsert({
      where:  { nis },
      update: {},
      create: {
        nis,
        nama:     s.nama,
        kelasId:  s.kelasId,
        isActive: true,
      },
    })
    console.log(`   - ${s.nama.padEnd(18)} | NIS: ${nis} | ${namaKelas}`)
  }

  console.log('\n🎉 Seeding selesai!')
  console.log('\n📋 Ringkasan akun:')
  console.log('   PIN untuk semua akun : 123456')
  console.log(`   Admin    : ${admin.nama}     (ID: ${admin.id})`)
  console.log(`   Pengajar : ${pengajar1.nama} → ${kelasA.nama}`)
  console.log(`   Pengajar : ${pengajar2.nama}  → ${kelasB.nama}`)
}

main()
  .catch((e) => {
    console.error('❌ Error saat seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
