import type { Metadata } from 'next'
import LegalDoc from '@/components/public/LegalDoc'
import { REFUNDS } from '@/lib/public/legal'

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy — Pranix AI Labs',
  description:
    'How cancellations and refunds work for Pranix AI Labs subscriptions — the 7-day first-subscription refund, how to cancel, how long money takes to return and how to escalate.',
  alternates: { canonical: 'https://www.pranixailabs.com/refunds' },
  robots: { index: true, follow: true },
}

export default function RefundsPage() {
  return (
    <LegalDoc
      title="Refund & Cancellation Policy"
      intro="Cancel any time, in one click, with no notice period. If a first subscription is not what you expected, tell us within 7 days and we return the money in full. The detail below is the whole of it."
      sections={REFUNDS}
    />
  )
}
