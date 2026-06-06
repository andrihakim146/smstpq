import { PrismaClient } from '../../generated/client/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Mencegah pembuatan instance Prisma Client yang berlebihan di lingkungan development
// (karena hot-reload Next.js dapat membuat koneksi baru setiap kali modul dimuat ulang)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool:   Pool | undefined
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('[prisma] DATABASE_URL tidak diset — koneksi database akan gagal.')
  }

  return new Pool({
    connectionString,
    // Serverless (Netlify): satu koneksi per instance function
    max:                     1,
    idleTimeoutMillis:       20_000,
    connectionTimeoutMillis: 10_000,
    // Supabase memerlukan SSL di production
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined,
  })
}

function createPrismaClient(): PrismaClient {
  const pool    = globalForPrisma.pool ?? createPool()
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

if (!globalForPrisma.pool) {
  globalForPrisma.pool = createPool()
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
