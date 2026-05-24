import Link from 'next/link'
import { ArrowRight, Shield, Cpu, GitBranch } from 'lucide-react'

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-20 md:pt-28">
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight md:text-[2.75rem] md:leading-[1.15]">
          Protocol-grade operational infrastructure
          for AI-assisted execution.
        </h1>
        <p className="mt-4 max-w-xl text-base text-fg-secondary md:text-lg">
          Deterministic-first orchestration. Evidence-led systems.
          Supervised autonomy with full auditability.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/products"
            className="flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors duration-fast hover:bg-accent-hover"
          >
            View products
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/infrastructure"
            className="flex items-center gap-2 rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium text-fg-primary transition-colors duration-fast hover:bg-surface"
          >
            Infrastructure
          </Link>
        </div>
      </section>

      <section className="border-t border-border-subtle">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <h2 className="text-lg font-semibold text-fg-primary md:text-xl">
            Operational philosophy
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle">
                <Shield className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-base font-medium text-fg-primary">
                Deterministic-first
              </h3>
              <p className="text-sm leading-relaxed text-fg-secondary">
                Every operation is auditable, replayable, and
                evidence-grounded. AI assists execution — it does
                not replace oversight.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle">
                <Cpu className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-base font-medium text-fg-primary">
                Provider-neutral
              </h3>
              <p className="text-sm leading-relaxed text-fg-secondary">
                Orchestration infrastructure that routes work to
                the best available provider — no single-vendor
                dependency.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle">
                <GitBranch className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-base font-medium text-fg-primary">
                Supervised autonomy
              </h3>
              <p className="text-sm leading-relaxed text-fg-secondary">
                Agents operate within protocol boundaries.
                Every mutation requires founder approval.
                Every decision leaves an audit trail.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border-subtle">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-fg-primary md:text-xl">
              Products
            </h2>
            <Link
              href="/products"
              className="flex items-center gap-1 text-sm text-accent transition-colors duration-fast hover:text-accent-hover"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((product) => (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                className="group rounded-lg border border-border-subtle bg-surface p-4 transition-colors duration-fast hover:border-border-strong"
              >
                <h3 className="text-base font-medium text-fg-primary">
                  {product.name}
                </h3>
                <p className="mt-1 text-sm text-fg-secondary">
                  {product.description}
                </p>
                <span className="mt-3 inline-block rounded-sm bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
                  {product.type}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border-subtle">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <h2 className="text-lg font-semibold text-fg-primary md:text-xl">
            Infrastructure
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-secondary">
            The Pranix Agent Engine is a sovereign control plane for
            multi-product AI orchestration. DAG-based task execution,
            tiered worker topology, hybrid inference routing, and
            protocol-governed code changes — all under founder oversight.
          </p>
          <Link
            href="/infrastructure"
            className="mt-4 inline-flex items-center gap-1 text-sm text-accent transition-colors duration-fast hover:text-accent-hover"
          >
            Explore the architecture
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </>
  )
}

const PRODUCTS = [
  {
    slug: 'cart2save',
    name: 'Cart2Save',
    description: 'Commerce platform with ONDC buyer NP integration and affiliate infrastructure.',
    type: 'Commerce',
  },
  {
    slug: 'schoolos',
    name: 'School OS',
    description: 'Education infrastructure for institutional operations, attendance, and academic management.',
    type: 'Education',
  },
  {
    slug: 'vidyagrid',
    name: 'VidyaGrid',
    description: 'Adaptive learning platform for Class 9-10 Mathematics, SCERT AP curriculum.',
    type: 'Education',
  },
  {
    slug: 'quietkeep',
    name: 'QuietKeep',
    description: 'Personal and business intelligence layer with voice-first architecture.',
    type: 'Intelligence',
  },
  {
    slug: 'quickscanz',
    name: 'QuickScanZ',
    description: 'Warranty lifecycle management with QR-based product registration.',
    type: 'Warranty',
  },
] as const
