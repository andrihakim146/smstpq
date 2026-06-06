/**
 * Rate limiter berbasis `rate-limiter-flexible` dengan Memory store.
 *
 * Untuk production (Netlify serverless), setiap cold-start memiliki
 * memory store tersendiri. Ganti ke Redis/Upstash saat traffic tinggi:
 *   import { RateLimiterRedis } from 'rate-limiter-flexible'
 *   import { createClient } from 'redis'
 *   const redisClient = createClient({ url: process.env.REDIS_URL })
 *
 * CATATAN: rate-limiter-flexible tidak kompatibel langsung dengan
 * Next.js Edge Runtime (tidak ada Node.js API). File ini dijalankan
 * di Node.js runtime (middleware default).
 */

import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible'

export { RateLimiterRes }

/**
 * Endpoint publik: `/api/public/*` dan `/santri/[nis]`
 * Batas: 10 request per menit per IP.
 */
export const publicLimiter = new RateLimiterMemory({
  keyPrefix:  'rl_public',
  points:     10,   // jumlah request yang diizinkan
  duration:   60,   // jendela waktu dalam detik (1 menit)
  blockDuration: 60, // blokir selama 1 menit setelah limit terlampaui
})

/**
 * Endpoint login: `/api/auth/login`
 * Batas: 5 percobaan per jam per username (key = email/identifier login).
 * Melindungi dari brute-force PIN.
 */
export const loginLimiter = new RateLimiterMemory({
  keyPrefix:     'rl_login',
  points:        5,    // 5 percobaan
  duration:      3600, // jendela waktu 1 jam (3600 detik)
  blockDuration: 3600, // blokir 1 jam setelah limit terlampaui
})
