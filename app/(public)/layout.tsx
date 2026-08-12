import type { Metadata } from 'next'
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'
import Shell from '@/components/public/Shell'
import './public-site.css'

const fontD = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--px-font-d', display: 'swap' })
const fontB = Inter({ subsets: ['latin'], variable: '--px-font-b', display: 'swap' })
const fontM = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--px-font-m', display: 'swap' })

export const metadata: Metadata = {
  title: { absolute: 'Pranix AI Labs — Innovate. Build. Ascend.' },
  description:
    'Pranix AI Labs — an AI-native product studio from Hyderabad building 7 products across commerce, education, fintech, voice AI and events. Powered by Aaria, our multilingual voice engine.',
  alternates: { canonical: 'https://www.pranixailabs.com' },
  openGraph: {
    title: 'Pranix AI Labs — Innovate. Build. Ascend.',
    description: 'Seven products. One AI-native lab. Aaria voice inside. Made in Hyderabad.',
    url: 'https://www.pranixailabs.com',
    type: 'website',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Pranix AI Labs' }],
  },
}

// NOTE: the canonical Organization / WebSite JSON-LD is emitted once in
// app/layout.tsx. Do not add a second Organization node here — duplicate
// entities prevent Google from associating the logo with the brand.

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell fontClass={`${fontD.variable} ${fontB.variable} ${fontM.variable}`}>{children}</Shell>
  )
}
