import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-server'

/**
 * GET /api/admin/retensi/count?before=YYYY-MM-DD
 * Menghitung jumlah record absensi yang lebih lama dari `before`.
 */
export async function GET(request: NextRequest) {
  const check = requireAdmin(request)
  if (check) return check

  const before = request.nextUrl.searchParams.get('before')
  if (!before || !/^\d{4}-\d{2}-\d{2}$/.test(before)) {
    return NextResponse.json({ error: 'Parameter before (YYYY-MM-DD) wajib diisi.' }, { status: 400 })
  }

  const count = await prisma.absensi.count({
    where: { tanggal: { lt: new Date(before) } },
  })

  return NextResponse.json({ count, before })
}
