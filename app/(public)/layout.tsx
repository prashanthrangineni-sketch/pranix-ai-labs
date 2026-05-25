import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Products', href: '/products' },
  { label: 'Infrastructure', href: '/infrastructure' },
  { label: 'Status', href: '/status' },
  { label: 'About', href: '/about' },
] as const

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div data-theme="light" className="flex min-h-screen flex-col bg-[hsl(var(--bg-canvas))] text-[hsl(var(--fg-primary))]">
      <header className="sticky top-0 z-50 border-b border-[hsl(var(--border-subtle))] bg-white/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Pranix AI Labs" width={36} height={36} className="rounded-lg" />
            <span className="text-base font-semibold tracking-tight text-[hsl(var(--fg-primary))]">Pranix AI Labs</span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-[hsl(var(--fg-secondary))] transition-colors hover:text-[hsl(var(--fg-primary))]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/founder/login"
              className="flex items-center gap-1.5 rounded-md bg-[hsl(var(--accent-default))] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--accent-hover))]"
            >
              Founder Login
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <button
            className="flex h-10 w-10 items-center justify-center rounded-md text-[hsl(var(--fg-secondary))] md:hidden"
            aria-label="Open menu"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" className="stroke-current" strokeWidth="1.5" strokeLinecap="round">
              <line x1="0" y1="1" x2="18" y2="1" />
              <line x1="0" y1="7" x2="18" y2="7" />
              <line x1="0" y1="13" x2="18" y2="13" />
            </svg>
          </button>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-surface))]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="" width={24} height={24} className="rounded" />
                <h3 className="text-sm font-semibold">Pranix AI Labs Pvt Ltd</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--fg-muted))]">
                Protocol-grade operational infrastructure for AI-assisted execution.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Products</h3>
              <ul className="mt-2 space-y-1.5">
                {[
                  { name: 'Cart2Save', url: 'https://www.cart2save.com' },
                  { name: 'EdProSys', url: 'https://www.edprosys.com' },
                  { name: 'QuietKeep', url: 'https://www.quietkeep.com' },
                  { name: 'QuickScanZ', url: 'https://www.quickscanz.com' },
                ].map((p) => (
                  <li key={p.name}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[hsl(var(--fg-secondary))] hover:text-[hsl(var(--fg-primary))]">{p.name}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Company</h3>
              <ul className="mt-2 space-y-1.5">
                {[
                  { label: 'About', href: '/about' },
                  { label: 'Infrastructure', href: '/infrastructure' },
                  { label: 'Status', href: '/status' },
                  { label: 'Contact', href: '/contact' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-xs text-[hsl(var(--fg-secondary))] hover:text-[hsl(var(--fg-primary))]">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Contact</h3>
              <ul className="mt-2 space-y-1.5 text-xs text-[hsl(var(--fg-secondary))]">
                <li><a href="mailto:support@pranixailabs.com" className="hover:text-[hsl(var(--fg-primary))]">support@pranixailabs.com</a></li>
                <li><a href="mailto:founder@pranixailabs.com" className="hover:text-[hsl(var(--fg-primary))]">founder@pranixailabs.com</a></li>
                <li><a href="https://wa.me/919494999494" className="hover:text-[hsl(var(--fg-primary))]">WhatsApp: 9494999494</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-[hsl(var(--border-subtle))] pt-6">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[hsl(var(--fg-muted))]">
              <span>CIN: U62011TS2026PTC209631</span>
              <span>MSME: UDYAM-TS-02-0307772</span>
              <span>DPIIT: DIPP241828</span>
            </div>
            <p className="mt-2 text-xs text-[hsl(var(--fg-disabled))]">
              \u00a9 {new Date().getFullYear()} Pranix AI Labs Pvt Ltd. Hyderabad, Telangana.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
