import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromHeaders } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  const session = getSessionFromHeaders(request)
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 401 })
  }

  const sp      = request.nextUrl.searchParams
  const q       = sp.get('q')?.trim() ?? ''
  const kelasId = sp.get('kelasId') ?? undefined

  const santri = await prisma.santri.findMany({
    where: {
      status: 'AKTIF',
      isActive: true,
      ...(kelasId ? { kelasId } : {}),
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
    take: q.length > 0 ? 20 : 50,
  })

  return NextResponse.json(santri)
}
