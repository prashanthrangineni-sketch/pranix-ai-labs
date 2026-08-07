'use client'
// components/public/Shell.tsx — public-site chrome: nav, theme, footer, effects, Aaria dock
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Effects from './Effects'
import AariaDock from './AariaDock'
import { PRODUCTS } from '@/lib/public/data'

const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Aaria Voice', href: '/aaria' },
  { label: 'Services', href: '/services' },
  { label: 'Infrastructure', href: '/infrastructure' },
  { label: 'Status', href: '/status' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export default function Shell({ children, fontClass }: { children: React.ReactNode; fontClass?: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <div className={`pxp ${fontClass ?? ''}`} data-px-theme={theme}>
      <Effects />
      <div className="aurora a1" /><div className="aurora a2" /><div className="aurora a3" />

      <header className="pxheader">
        <nav className="nav">
          <Link className="logo" href="/">
            <span className="logo-badge"><img src="/px-mark.png" alt="Pranix AI Labs" /></span> Pranix AI Labs
          </Link>
          <div className={`navlinks ${menuOpen ? 'open' : ''}`}>
            {NAV.map(n => (
              <Link key={n.href} href={n.href} className={active(n.href) ? 'active' : ''} onClick={() => setMenuOpen(false)}>{n.label}</Link>
            ))}
            <Link className="btn btn-primary" href="/founder/login">Founder Login →</Link>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="theme-toggle" title="Toggle theme" onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}>
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
            <button className="hamb" onClick={() => setMenuOpen(o => !o)}>☰</button>
          </div>
        </nav>
      </header>

      <main style={{ paddingTop: 66, position: 'relative', zIndex: 2 }}>{children}</main>

      <AariaDock />

      <footer className="pxfooter">
        <div className="wrap">
          <div className="fgrid">
            <div>
              <Link className="logo" href="/"><span className="logo-badge"><img src="/px-mark.png" alt="" /></span> Pranix AI Labs</Link>
              <p style={{ fontSize: '.82rem', color: 'var(--text2)', lineHeight: 1.6, marginTop: 12 }}>
                Protocol-grade operational infrastructure for AI-assisted execution. Building India-first products with supervised AI autonomy.
              </p>
            </div>
            <div><h4>Products</h4><ul>
              {PRODUCTS.map(p => <li key={p.id}><a href={p.url} target="_blank" rel="noopener noreferrer">{p.name}</a></li>)}
            </ul></div>
            <div><h4>Company</h4><ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/services">Services</Link></li>
              <li><Link href="/infrastructure">Infrastructure</Link></li>
              <li><Link href="/status">Status</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/founder/login">Founder Login</Link></li>
            </ul></div>
            <div><h4>Contact</h4><ul>
              <li><a href="mailto:support@pranixailabs.com">support@pranixailabs.com</a></li>
              <li><a href="tel:+919515479595">Services: +91 95154 79595</a></li>
              <li><a href="https://wa.me/919515479595" target="_blank" rel="noopener noreferrer">WhatsApp: 95154 79595</a></li>
            </ul></div>
          </div>
          <div className="fmeta">
            <span>CIN: U62011TS2026PTC209631</span>
            <span>MSME: UDYAM-TS-02-0307772</span>
            <span>DPIIT: DIPP241828</span>
            <span>T-Hub member</span>
            <span>© {new Date().getFullYear()} Pranix AI Labs Pvt Ltd · Hyderabad, Telangana</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
