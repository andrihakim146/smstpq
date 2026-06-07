import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const PIN_TAKEN_MESSAGE = 'PIN telah digunakan.'

/** Cari pengajar lain yang memakai PIN yang sama (bcrypt compare). */
export async function findPengajarWithPin(
  pin: string,
  excludeId?: string,
): Promise<{ id: string; nama: string } | null> {
  const list = await prisma.pengajar.findMany({
    where:  excludeId ? { id: { not: excludeId } } : undefined,
    select: { id: true, nama: true, pinHash: true },
  })

  for (const p of list) {
    if (await bcrypt.compare(pin, p.pinHash)) {
      return { id: p.id, nama: p.nama }
    }
  }
  return null
}

export async function isPinAvailable(pin: string, excludeId?: string): Promise<boolean> {
  return (await findPengajarWithPin(pin, excludeId)) === null
}
