import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Products',
  description: 'Customer-facing products from Pranix AI Labs.',
}

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <h1 className="text-xl font-semibold md:text-2xl">Products</h1>
      <p className="mt-2 max-w-xl text-sm text-fg-secondary">
        Each product serves a distinct vertical while feeding into the
        Pranix operational substrate.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIVE_PRODUCTS.map((p) => (
          <Link
            key={p.slug}
            href={`/products/${p.slug}`}
            className="group flex flex-col rounded-lg border border-border-subtle bg-surface p-5 transition-colors duration-fast hover:border-border-strong"
          >
            <span className="inline-block w-fit rounded-sm bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
              {p.type}
            </span>
            <h2 className="mt-3 text-base font-medium text-fg-primary">
              {p.name}
            </h2>
            <p className="mt-1 flex-1 text-sm text-fg-secondary">
              {p.description}
            </p>
            {p.url && (
              <span className="mt-3 text-xs font-mono text-fg-muted">
                {p.url}
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className="mt-16">
        <h2 className="text-lg font-semibold text-fg-primary">
          Research &amp; Future Systems
        </h2>
        <p className="mt-2 text-sm text-fg-secondary">
          Early-stage initiatives under exploration. Not yet in active development.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FUTURE_SYSTEMS.map((p) => (
            <div
              key={p.name}
              className="rounded-lg border border-border-subtle bg-surface/50 p-5"
            >
              <span className="inline-block w-fit rounded-sm border border-border-subtle px-2 py-0.5 text-xs text-fg-muted">
                {p.type}
              </span>
              <h3 className="mt-3 text-base font-medium text-fg-secondary">
                {p.name}
              </h3>
              <p className="mt-1 text-sm text-fg-muted">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const ACTIVE_PRODUCTS = [
  { slug: 'cart2save', name: 'Cart2Save', description: 'Commerce platform with ONDC buyer NP integration and affiliate infrastructure.', type: 'Commerce', url: 'cart2save.com' },
  { slug: 'schoolos', name: 'School OS', description: 'Education infrastructure for institutional operations, attendance, and academic management.', type: 'Education', url: 'schoolos.in' },
  { slug: 'vidyagrid', name: 'VidyaGrid', description: 'Adaptive learning platform for Class 9-10 Mathematics, SCERT AP curriculum.', type: 'Education', url: null },
  { slug: 'quietkeep', name: 'QuietKeep', description: 'Personal and business intelligence layer with voice-first architecture.', type: 'Intelligence', url: 'quietkeep.com' },
  { slug: 'quickscanz', name: 'QuickScanZ', description: 'Warranty lifecycle management with QR-based product registration.', type: 'Warranty', url: 'quickscanz.com' },
] as const

const FUTURE_SYSTEMS = [
  { name: 'PMIL', description: 'Mobility intelligence layer for authorized dealer network validation.', type: 'Research' },
  { name: 'IELTS Platform', description: 'Test preparation and consultancy marketplace ecosystem.', type: 'Future' },
  { name: 'InsureUPI', description: 'Insurance integration via payment infrastructure.', type: 'Future' },
] as const
