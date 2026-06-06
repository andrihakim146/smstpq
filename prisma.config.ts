import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  datasource: {
    url: env('DATABASE_URL'),
    // directUrl diperlukan agar prisma migrate menggunakan koneksi langsung
    // (bukan pooler) sehingga shadow database bisa dibuat dengan benar
    directUrl: env('DIRECT_URL'),
  } as any,
})
