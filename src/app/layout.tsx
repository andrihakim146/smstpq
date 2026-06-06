import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import RegisterPWA from '@/components/RegisterPWA'
import './globals.css'

const nunito = Nunito({
  subsets:  ['latin'],
  variable: '--font-sans',
  display:  'swap',
})

export const viewport: Viewport = {
  themeColor:         '#0f766e',
  width:              'device-width',
  initialScale:       1,
  minimumScale:       1,
  viewportFit:        'cover',
}

export const metadata: Metadata = {
  metadataBase:  new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default:  'SMSTPQ — Sistem Manajemen Santri TPQ',
    template: '%s | SMSTPQ',
  },
  description: 'Platform manajemen santri TPQ berbasis web. Pantau perkembangan hafalan, absensi, dan progres Pra-Tahsin.',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:       true,
    statusBarStyle: 'default',
    title:         'SMSTPQ',
  },
  icons: {
    icon:    [
      { url: '/favicon.png',      sizes: '32x32',   type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple:   [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    other:   [{ rel: 'mask-icon', url: '/icon-192x192.png' }],
  },
  formatDetection: { telephone: false },
  openGraph: {
    type:        'website',
    siteName:    'SMSTPQ',
    title:       'SMSTPQ — Sistem Manajemen Santri TPQ',
    description: 'Pantau perkembangan hafalan dan kehadiran santri di TPQ.',
    images:      [{ url: '/icon-512x512.png', width: 512, height: 512 }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={`${nunito.variable} h-full antialiased`}>
      <head>
        {/* PWA — mobile browser chrome hints */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="msapplication-TileColor" content="#0f766e" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <RegisterPWA />
        {children}
      </body>
    </html>
  )
}
