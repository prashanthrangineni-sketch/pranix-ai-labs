import type { Metadata } from 'next'
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'
import Shell from '@/components/public/Shell'
import './public-site.css'

const fontD = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--px-font-d', display: 'swap' })
const fontB = Inter({ subsets: ['latin'], variable: '--px-font-b', display: 'swap' })
const fontM = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--px-font-m', display: 'swap' })

export const metadata: Metadata = {
  title: 'Pranix AI Labs — Innovate. Build. Ascend.',
  icons: { icon: [{ url: '/px-mark.png', type: 'image/png' }], shortcut: '/px-mark.png', apple: '/px-mark.png' },
  description: 'Pranix AI Labs — an AI-native product studio from Hyderabad building 7 products across commerce, education, fintech, voice AI and events. Powered by Aaria, our multilingual voice engine.',
  openGraph: {
    title: 'Pranix AI Labs — Innovate. Build. Ascend.',
    description: 'Seven products. One AI-native lab. Aaria voice inside. Made in Hyderabad.',
    url: 'https://www.pranixailabs.com',
    type: 'website',
  },
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Pranix AI Labs Pvt Ltd',
  url: 'https://www.pranixailabs.com',
  email: 'support@pranixailabs.com',
  telephone: '+91-9515479595',
  address: { '@type': 'PostalAddress', addressLocality: 'Hyderabad', addressRegion: 'Telangana', addressCountry: 'IN' },
  sameAs: [
    'https://www.edprosys.com', 'https://www.quietkeep.com', 'https://www.quickscanz.com',
    'https://www.cart2save.com', 'https://www.insureupi.com', 'https://www.easyvenuez.com', 'https://www.edgridai.com',
  ],
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <Shell fontClass={`${fontD.variable} ${fontB.variable} ${fontM.variable}`}>{children}</Shell>
    </>
  )
}
