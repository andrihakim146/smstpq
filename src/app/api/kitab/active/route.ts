import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromHeaders } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  const session = getSessionFromHeaders(request)
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 401 })
  }

  const kitab = await prisma.kitab.findMany({
    where:   { isActive: true },
    select:  { id: true, nama: true },
    orderBy: { nama: 'asc' },
  })

  return NextResponse.json(kitab)
}
