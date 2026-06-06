import type { NextConfig } from 'next'

// @ducanh2912/next-pwa uses webpack and conflicts with Turbopack (Next.js 16 default).
// PWA is configured manually: public/sw.js handles caching + push notifications,
// and src/components/RegisterPWA.tsx registers it on the client.
const nextConfig: NextConfig = {
  turbopack: {}, // explicitly opt-in to Turbopack (suppress warning)
}

export default nextConfig
