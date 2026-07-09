import type { Metadata } from 'next'
import { ArrowUpRight } from 'lucide-react'

const PAGE_URL = 'https://www.pranixailabs.com/products'
const PAGE_TITLE = 'Products | Pranix AI Labs'
const PAGE_DESCRIPTION = 'Pranix AI Labs product ecosystem — commerce, education, voice intelligence, warranty lifecycle. Cart2Save, EdProSys, VidyaGrid, QuietKeep, QuickScanZ.'

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    siteName: 'Pranix AI Labs',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
}

const ACTIVE_PRODUCTS = [
  {
    name: 'Cart2Save',
    tagline: 'AI-powered commerce with ONDC integration',
    url: 'https://www.cart2save.com',
    category: 'Commerce',
    phase: 'Advanced MVP',
    features: ['ONDC Buyer NP', 'Deal detection', 'Affiliate engine', 'Cashback intelligence'],
  },
  {
    name: 'EdProSys',
    tagline: 'Comprehensive school operations platform',
    url: 'https://www.edprosys.com',
    category: 'Education',
    phase: 'Phase 2 — RBAC',
    features: ['Institution hierarchy', 'Onboarding polymorphism', 'Multi-stakeholder access', 'Fee management'],
  },
  {
    name: 'VidyaGrid',
    tagline: 'Adaptive learning for Class 9-10 Mathematics (SCERT AP, Telugu medium)',
    url: null,
    category: 'Education',
    phase: 'Intelligence Layer',
    features: ['Concept mastery tracking', 'Adaptive question routing', 'Confidence measurement', 'Teacher dashboards'],
  },
  {
    name: 'QuietKeep',
    tagline: 'Voice-first dual-app personal and business OS',
    url: 'https://www.quietkeep.com',
    category: 'Intelligence',
    phase: 'Voice Pipeline',
    features: ['Wake word engine', 'Multi-language STT', 'Intent routing', 'Business ledger voice entry'],
  },
  {
    name: 'QuickScanZ',
    tagline: 'Warranty lifecycle and product tracking',
    url: 'https://www.quickscanz.com',
    category: 'Warranty',
    phase: 'Post-MVP',
    features: ['QR-based registration', 'Warranty expiry alerts', 'Service history', 'Push notifications'],
  },
] as const

const FUTURE_SYSTEMS = [
  { name: 'InsureUPI', desc: 'Micro-insurance distribution via UPI payment flows' },
  { name: 'PMIL', desc: 'Mobility intelligence layer for automotive dealer networks' },
  { name: 'IELTS Platform', desc: 'Test preparation and consultancy marketplace' },
] as const

function buildProductsJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Pranix AI Labs Products',
    itemListElement: ACTIVE_PRODUCTS.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SoftwareApplication',
        name: p.name,
        description: p.tagline,
        applicationCategory: p.category,
        ...(p.url ? { url: p.url } : {}),
        offers: { '@type': 'Offer', availability: 'https://schema.org/InStock' },
      },
    })),
  }
}

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductsJsonLd()) }}
      />
      <h1 className="text-3xl font-bold md:text-4xl">Products</h1>
      <p className="mt-3 max-w-2xl text-[hsl(var(--fg-secondary))]">
        Each product is a standalone system feeding into a unified operational graph.
        One control plane. Shared workers. Shared intelligence.
      </p>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {ACTIVE_PRODUCTS.map((p) => (
          <div key={p.name} className="rounded-xl border border-[hsl(var(--border-subtle))] p-6 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--fg-muted))]">{p.category}</span>
                <h2 className="mt-1 text-xl font-semibold">{p.name}</h2>
              </div>
              <span className="shrink-0 rounded-full bg-[hsl(var(--accent-subtle))] px-3 py-1 text-xs font-medium text-[hsl(var(--accent-default))]">
                {p.phase}
              </span>
            </div>
            <p className="mt-2 text-sm text-[hsl(var(--fg-secondary))]">{p.tagline}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {p.features.map((f) => (
                <li key={f} className="rounded-md bg-[hsl(var(--bg-elevated))] px-2.5 py-1 text-xs text-[hsl(var(--fg-secondary))]">
                  {f}
                </li>
              ))}
            </ul>
            {p.url && (
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--accent-default))] hover:underline">
                Visit {p.name} <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="mt-16">
        <h2 className="text-xl font-semibold">Research & Future Systems</h2>
        <p className="mt-2 text-sm text-[hsl(var(--fg-secondary))]">
          Planned products in the Pranix ecosystem. Architecture designed, implementation pending.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {FUTURE_SYSTEMS.map((s) => (
            <div key={s.name} className="rounded-lg border border-dashed border-[hsl(var(--border-subtle))] p-4">
              <h3 className="text-sm font-semibold">{s.name}</h3>
              <p className="mt-1 text-xs text-[hsl(var(--fg-muted))]">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
