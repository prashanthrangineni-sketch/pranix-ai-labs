import type { Metadata } from 'next'
import Link from 'next/link'
import {
  LayoutDashboard,
  Package,
  Activity,
  Bell,
  MoreHorizontal,
} from 'lucide-react'

export const metadata: Metadata = {
  title: {
    default: 'Founder',
    template: '%s \u2014 Founder \u2014 Pranix',
  },
  robots: { index: false, follow: false },
}

const BOTTOM_NAV = [
  { label: 'Overview', href: '/founder', icon: LayoutDashboard },
  { label: 'Products', href: '/founder/products', icon: Package },
  { label: 'Workers', href: '/founder/workers', icon: Activity },
  { label: 'Alerts', href: '/founder/alerts', icon: Bell },
  { label: 'More', href: '/founder/more', icon: MoreHorizontal },
] as const

export default function FounderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-50 flex h-12 items-center border-b border-border-subtle bg-canvas/90 px-4 backdrop-blur-sm">
        <Link href="/founder" className="text-sm font-semibold text-fg-primary">
          Pranix
        </Link>
        <span className="ml-2 rounded-sm bg-accent-subtle px-1.5 py-0.5 text-xs font-medium text-accent">
          Founder
        </span>
      </header>

      <main className="flex-1 pb-16">{children}</main>

      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t border-border-subtle bg-canvas/95 backdrop-blur-sm">
        {BOTTOM_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-fg-muted transition-colors duration-fast hover:text-fg-primary"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
