import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromHeaders } from '@/lib/auth-server'

/**
 * GET /api/santri?kelasId=<uuid>
 * Mengembalikan daftar santri aktif dari kelas tertentu, diurutkan by nama.
 */
export async function GET(request: NextRequest) {
  const session = getSessionFromHeaders(request)
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 401 })
  }

  const kelasId = request.nextUrl.searchParams.get('kelasId')
  if (!kelasId) {
    return NextResponse.json({ error: 'Parameter kelasId wajib diisi.' }, { status: 400 })
  }

  const santri = await prisma.santri.findMany({
    where: { kelasId, isActive: true },
    select: {
      id:   true,
      nis:  true,
      nama: true,
      kelas: { select: { nama: true } },
    },
    orderBy: { nama: 'asc' },
  })

  return NextResponse.json(santri)
}
