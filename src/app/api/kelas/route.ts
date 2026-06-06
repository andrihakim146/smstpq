import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromHeaders } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  const session = getSessionFromHeaders(request)
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 401 })
  }

  const kelas = await prisma.kelas.findMany({
    orderBy: { nama: 'asc' },
    select: {
      id:   true,
      nama: true,
      _count: { select: { santri: { where: { isActive: true } } } },
    },
  })

  return NextResponse.json(kelas)
}
