import { PrismaClient } from '../../generated/client/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool, type PoolConfig } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool:   Pool | undefined
}

/**
 * Siapkan connection string + opsi SSL untuk Supabase di serverless (Netlify).
 *
 * `?sslmode=require` di URL + pg v8 akan memaksa verify-full dan gagal dengan
 * "self-signed certificate in certificate chain". Solusi: pakai uselibpqcompat
 * atau hapus sslmode dari URL dan set ssl.rejectUnauthorized di Pool.
 */
function getPoolConfig(): PoolConfig {
  const raw = process.env.DATABASE_URL
  if (!raw) {
    console.error('[prisma] DATABASE_URL tidak diset — koneksi database akan gagal.')
    return { connectionString: undefined, max: 1 }
  }

  let connectionString = raw

  // Normalisasi URL Supabase: ganti sslmode=require yang bermasalah di pg v8
  if (connectionString.includes('sslmode=require') && !connectionString.includes('uselibpqcompat')) {
    connectionString = connectionString.replace(
      'sslmode=require',
      'uselibpqcompat=true&sslmode=require',
    )
  }

  const isSupabase =
    connectionString.includes('supabase.co') ||
    connectionString.includes('pooler.supabase.com')

  const config: PoolConfig = {
    connectionString,
    max:                     1,
    idleTimeoutMillis:       20_000,
    connectionTimeoutMillis: 15_000,
  }

  // Supabase selalu butuh SSL; rejectUnauthorized:false untuk sertifikat pooler
  if (isSupabase || process.env.NODE_ENV === 'production') {
    config.ssl = { rejectUnauthorized: false }
  }

  return config
}

function createPool(): Pool {
  return new Pool(getPoolConfig())
}

function createPrismaClient(): PrismaClient {
  const pool    = globalForPrisma.pool ?? createPool()
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = createPool()
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

// Lazy singleton — hindari koneksi DB saat build time
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma()
    const value  = Reflect.get(client, prop)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
