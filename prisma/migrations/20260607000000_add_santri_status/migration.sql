-- CreateEnum
CREATE TYPE "StatusSantri" AS ENUM ('AKTIF', 'LULUS', 'PINDAH', 'KELUAR');

-- AlterTable
ALTER TABLE "Santri" ADD COLUMN     "status"        "StatusSantri" NOT NULL DEFAULT 'AKTIF',
ADD COLUMN     "statusSejak"   DATE,
ADD COLUMN     "statusCatatan" TEXT;

-- Santri nonaktif yang sudah ada dianggap KELUAR
UPDATE "Santri" SET "status" = 'KELUAR' WHERE "isActive" = false;
