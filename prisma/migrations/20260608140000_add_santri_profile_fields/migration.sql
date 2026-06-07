-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- AlterTable
ALTER TABLE "Santri"
  ADD COLUMN "jenisKelamin" "JenisKelamin",
  ADD COLUMN "usia"         INTEGER,
  ADD COLUMN "namaWali"     TEXT,
  ADD COLUMN "alamat"       TEXT;
