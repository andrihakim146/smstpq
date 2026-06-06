import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-server'

const PAGE_SIZE = 50

// GET /api/admin/log?startDate=&endDate=&aksi=&page=
export async function GET(request: NextRequest) {
  const check = requireAdmin(request)
  if (check) return check

  const sp        = request.nextUrl.searchParams
  const startDate = sp.get('startDate')
  const endDate   = sp.get('endDate')
  const aksi      = sp.get('aksi')?.trim() ?? ''
  const page      = Math.max(1, Number(sp.get('page') ?? '1'))

  const where = {
    ...(aksi ? { aksi: { contains: aksi, mode: 'insensitive' as const } } : {}),
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate ? { gte: new Date(startDate + 'T00:00:00.000Z') } : {}),
            ...(endDate   ? { lte: new Date(endDate   + 'T23:59:59.999Z') } : {}),
          },
        }
      : {}),
  }

  const [total, logs] = await Promise.all([
    prisma.logAktivitas.count({ where }),
    prisma.logAktivitas.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      select: {
        id:        true,
        aksi:      true,
        detail:    true,
        ip:        true,
        createdAt: true,
        pengajar:  { select: { nama: true } },
      },
    }),
  ])

  return NextResponse.json({
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
    data: logs,
  })
}
