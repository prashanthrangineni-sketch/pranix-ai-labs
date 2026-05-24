import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Products', href: '/products' },
  { label: 'Infrastructure', href: '/infrastructure' },
  { label: 'Research', href: '/research' },
  { label: 'Status', href: '/status' },
  { label: 'About', href: '/about' },
] as const

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-canvas/80 backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-fg-primary"
          >
            Pranix AI Labs
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-fg-secondary transition-colors duration-fast hover:text-fg-primary"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/founder"
              className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors duration-fast hover:bg-accent-hover"
            >
              Founder Login
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <button
            className="flex h-10 w-10 items-center justify-center rounded-md text-fg-secondary md:hidden"
            aria-label="Open menu"
          >
            <svg
              width="18"
              height="14"
              viewBox="0 0 18 14"
              fill="none"
              className="stroke-current"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <line x1="0" y1="1" x2="18" y2="1" />
              <line x1="0" y1="7" x2="18" y2="7" />
              <line x1="0" y1="13" x2="18" y2="13" />
            </svg>
          </button>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border-subtle bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="text-sm font-semibold text-fg-primary">
                Pranix AI Labs Pvt Ltd
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                Protocol-grade operational infrastructure
                for AI-assisted execution.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-fg-primary">
                Products
              </h3>
              <ul className="mt-2 space-y-1.5">
                {['Cart2Save', 'School OS', 'VidyaGrid', 'QuietKeep', 'QuickScanZ'].map(
                  (name) => (
                    <li key={name}>
                      <Link
                        href={`/products/${name.toLowerCase().replace(/\s/g, '')}`}
                        className="text-xs text-fg-secondary transition-colors duration-fast hover:text-fg-primary"
                      >
                        {name}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-fg-primary">
                Company
              </h3>
              <ul className="mt-2 space-y-1.5">
                {[
                  { label: 'About', href: '/about' },
                  { label: 'Vision', href: '/vision' },
                  { label: 'Infrastructure', href: '/infrastructure' },
                  { label: 'Contact', href: '/contact' },
                  { label: 'Privacy', href: '/legal/privacy' },
                  { label: 'Terms', href: '/legal/terms' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-fg-secondary transition-colors duration-fast hover:text-fg-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-fg-primary">
                Contact
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-fg-secondary">
                <li>
                  <a href="mailto:support@pranixailabs.com" className="hover:text-fg-primary transition-colors duration-fast">
                    support@pranixailabs.com
                  </a>
                </li>
                <li>
                  <a href="mailto:founder@pranixailabs.com" className="hover:text-fg-primary transition-colors duration-fast">
                    founder@pranixailabs.com
                  </a>
                </li>
                <li>
                  <a href="https://wa.me/919494999494" className="hover:text-fg-primary transition-colors duration-fast">
                    WhatsApp: 9494999494
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-border-subtle pt-6">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-fg-muted">
              <span>CIN: U62011TS2026PTC209631</span>
              <span>MSME: UDYAM-TS-02-0307772</span>
              <span>DPIIT: DIPP241828</span>
            </div>
            <p className="mt-2 text-xs text-fg-disabled">
              © {new Date().getFullYear()} Pranix AI Labs Pvt Ltd.
              Hyderabad, Telangana.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
