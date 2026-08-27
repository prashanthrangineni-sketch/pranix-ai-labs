import type { Metadata } from 'next'
import LegalDoc from '@/components/public/LegalDoc'
import { TERMS } from '@/lib/public/legal'

export const metadata: Metadata = {
  title: 'Terms of Service — Pranix AI Labs',
  description:
    'The terms on which Pranix AI Labs Private Limited provides its products and professional services — accounts, acceptable use, billing, AI accuracy, liability and governing law.',
  alternates: { canonical: 'https://www.pranixailabs.com/terms' },
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of Service"
      intro="These are the terms on which we provide our products and services. They are written to be read, not to be survived — if anything here is unclear, ask us before you agree to it."
      sections={TERMS}
    />
  )
}
