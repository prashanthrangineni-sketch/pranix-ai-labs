import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Pranix AI Labs',
    template: '%s — Pranix AI Labs',
  },
  description:
    'Protocol-grade operational infrastructure for AI-assisted execution. Deterministic-first orchestration with supervised autonomy.',
  metadataBase: new URL('https://www.pranixailabs.com'),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Pranix AI Labs',
  },
  robots: {
    index: true,
    follow: true,
  },
  // PWA metadata — wires manifest and Apple standalone mode
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Pranix',
  },
}

export const viewport: Viewport = {
  themeColor: '#0e1014',
  width: 'device-width',
  initialScale: 1,
  // maximumScale kept at 5 (not 1) — locking zoom breaks accessibility
  maximumScale: 5,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="font-sans min-h-screen bg-canvas text-fg-primary antialiased">
        {children}
      </body>
    </html>
  )
}
