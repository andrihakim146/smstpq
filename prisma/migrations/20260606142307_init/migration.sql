-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PENGAJAR');

-- CreateEnum
CREATE TYPE "TipeSetoran" AS ENUM ('AL_QURAN', 'PRA_TAHSIN');

-- CreateEnum
CREATE TYPE "KategoriSetoran" AS ENUM ('ZIYADAH', 'MUROJAAH');

-- CreateEnum
CREATE TYPE "StatusAbsensi" AS ENUM ('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT');

-- CreateTable
CREATE TABLE "Pengajar" (
    "id" UUID NOT NULL,
    "nama" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "peran" "Role" NOT NULL DEFAULT 'PENGAJAR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pengajar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kelas" (
    "id" UUID NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "Kelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Santri" (
    "id" UUID NOT NULL,
    "nis" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kelasId" UUID,
    "targetPembelajaran" TEXT,
    "deadlineTarget" DATE,
    "noWaWali" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Santri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kitab" (
    "id" UUID NOT NULL,
    "nama" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kitab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setoran" (
    "id" UUID NOT NULL,
    "santriId" UUID NOT NULL,
    "pengajarId" UUID NOT NULL,
    "tanggal" DATE NOT NULL,
    "tipe" "TipeSetoran" NOT NULL,
    "surah" TEXT,
    "ayatMulai" INTEGER,
    "ayatSelesai" INTEGER,
    "kitabId" UUID,
    "halamanMulai" INTEGER,
    "halamanSelesai" INTEGER,
    "kategori" "KategoriSetoran",
    "nilai" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Setoran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Catatan" (
    "id" UUID NOT NULL,
    "santriId" UUID NOT NULL,
    "pengajarId" UUID NOT NULL,
    "isi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Catatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absensi" (
    "id" UUID NOT NULL,
    "santriId" UUID NOT NULL,
    "tanggal" DATE NOT NULL,
    "status" "StatusAbsensi" NOT NULL DEFAULT 'HADIR',
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Absensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAktivitas" (
    "id" UUID NOT NULL,
    "pengajarId" UUID,
    "aksi" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAktivitas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Santri_nis_key" ON "Santri"("nis");

-- CreateIndex
CREATE INDEX "Absensi_tanggal_idx" ON "Absensi"("tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "Absensi_santriId_tanggal_key" ON "Absensi"("santriId", "tanggal");

-- CreateIndex
CREATE INDEX "LogAktivitas_createdAt_idx" ON "LogAktivitas"("createdAt");

-- AddForeignKey
ALTER TABLE "Santri" ADD CONSTRAINT "Santri_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setoran" ADD CONSTRAINT "Setoran_santriId_fkey" FOREIGN KEY ("santriId") REFERENCES "Santri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setoran" ADD CONSTRAINT "Setoran_pengajarId_fkey" FOREIGN KEY ("pengajarId") REFERENCES "Pengajar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setoran" ADD CONSTRAINT "Setoran_kitabId_fkey" FOREIGN KEY ("kitabId") REFERENCES "Kitab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Catatan" ADD CONSTRAINT "Catatan_santriId_fkey" FOREIGN KEY ("santriId") REFERENCES "Santri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Catatan" ADD CONSTRAINT "Catatan_pengajarId_fkey" FOREIGN KEY ("pengajarId") REFERENCES "Pengajar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_santriId_fkey" FOREIGN KEY ("santriId") REFERENCES "Santri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAktivitas" ADD CONSTRAINT "LogAktivitas_pengajarId_fkey" FOREIGN KEY ("pengajarId") REFERENCES "Pengajar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
