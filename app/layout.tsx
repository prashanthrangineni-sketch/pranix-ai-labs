import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import RegisterServiceWorker from '@/app/founder/_components/RegisterServiceWorker'
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

const SITE_URL = 'https://www.pranixailabs.com'

const SITE_DESCRIPTION =
  'Pranix AI Labs is India’s sovereign AI product studio building compliance-first, auditable AI systems for commerce, education, life and ownership. Cart2Save, QuietKeep, QuickScanZ and School OS share a protocol-grade agent engine for real-time decisions.'

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Pranix AI Labs',
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  description: SITE_DESCRIPTION,
  founder: {
    '@type': 'Person',
    name: 'Prashanth Rao Rangineni',
    jobTitle: 'Principal Architect & Founder',
  },
  sameAs: [
    'https://www.linkedin.com/company/pranix-ai-labs-private-limited/',
    'https://www.linkedin.com/in/prashanth-rao-rangineni-9a3b5266',
  ],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Hyderabad',
    addressRegion: 'Telangana',
    addressCountry: 'IN',
  },
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Pranix AI Labs',
  url: SITE_URL,
}

export const metadata: Metadata = {
  title: {
    default:
      'Pranix AI Labs | Sovereign AI Product Studio — Cart2Save, QuietKeep, QuickScanZ & School OS',
    template: '%s — Pranix AI Labs',
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Pranix AI Labs',
    title: 'Pranix AI Labs | Sovereign AI Product Studio',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: '/icon-512.png', alt: 'Pranix AI Labs' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pranix AI Labs | Sovereign AI Product Studio',
    description: SITE_DESCRIPTION,
    images: ['/icon-512.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
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
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans min-h-screen antialiased">
        <RegisterServiceWorker />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd),
          }}
        />
        {children}
      </body>
    </html>
  )
}
