import type { Metadata } from 'next'
import LegalDoc from '@/components/public/LegalDoc'
import { DATA_DELETION } from '@/lib/public/legal'

export const metadata: Metadata = {
  title: 'Data Deletion — Pranix AI Labs',
  description:
    'How to ask Pranix AI Labs Private Limited to delete your personal data, including data received through Facebook, Instagram, WhatsApp, Google or YouTube sign-in or connections.',
  alternates: { canonical: 'https://www.pranixailabs.com/data-deletion' },
  robots: { index: true, follow: true },
}

export default function DataDeletionPage() {
  return (
    <LegalDoc
      title="Data Deletion Instructions"
      intro="You can ask us to delete your personal data at any time. This page explains exactly how, what we delete, what the law makes us keep, and how long it takes."
      sections={DATA_DELETION}
    />
  )
}
