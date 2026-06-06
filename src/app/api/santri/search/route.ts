import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromHeaders } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  const session = getSessionFromHeaders(request)
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 401 })
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''

  const santri = await prisma.santri.findMany({
    where: {
      isActive: true,
      ...(q.length > 0
        ? {
            OR: [
              { nama: { contains: q, mode: 'insensitive' } },
              { nis:  { contains: q } },
            ],
          }
        : {}),
    },
    select: {
      id:   true,
      nis:  true,
      nama: true,
      kelas: { select: { nama: true } },
    },
    orderBy: { nama: 'asc' },
    take: 20,
  })

  return NextResponse.json(santri)
}
