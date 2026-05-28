import type { Metadata } from 'next'
import Link from 'next/link'
import {
  LayoutDashboard, Bot, ListChecks, Bell, ShieldCheck,
  Brain, Monitor, Lock, Activity, Rocket, Package,
  Settings, Network, ChevronDown, Clock, TriangleAlert,
  Sun,
} from 'lucide-react'

export const metadata: Metadata = {
  title: { default: 'Founder', template: '%s — Founder — Pranix' },
  robots: { index: false, follow: false },
}

const SIDEBAR_NAV = [
  { label: 'Overview',             href: '/founder',              icon: LayoutDashboard },
  { label: 'Agents',               href: '/founder/workers',      icon: Bot },
  { label: 'Tasks',                href: '/founder/tasks',        icon: ListChecks },
  { label: 'Alerts',               href: '/founder/alerts',       icon: Bell,       badge: 27 },
  { label: 'Approvals',            href: '/founder/approvals',    icon: ShieldCheck, badge: 0 },
  { label: 'Memory',               href: '/founder/memory',       icon: Brain },
  { label: 'Browser Intelligence', href: '/founder/baselines',    icon: Monitor },
  { label: 'Protocols',            href: '/founder/more',         icon: Lock },
  { label: 'Observability',        href: '/founder/more',         icon: Activity },
  { label: 'Deployments',          href: '/founder/more',         icon: Rocket },
  { label: 'Products',             href: '/founder/products',     icon: Package },
  { label: 'Settings',             href: '/founder/more',         icon: Settings,   chevron: true },
  { label: 'Orchestration',        href: '/founder/orchestrate',  icon: Network,    chevron: true, badgeText: 'NEW' },
] as const

const BOTTOM_NAV = [
  { label: 'Overview',  href: '/founder',           icon: LayoutDashboard },
  { label: 'Products',  href: '/founder/products',  icon: Package },
  { label: 'Tasks',     href: '/founder/tasks',     icon: ListChecks },
  { label: 'Alerts',    href: '/founder/alerts',    icon: Bell },
  { label: 'Approvals', href: '/founder/approvals', icon: ShieldCheck },
  { label: 'More',      href: '/founder/more',      icon: ChevronDown },
] as const

export default function FounderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas text-fg-primary" style={{ fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}>

      {/* ── Sidebar (desktop only) ── */}
      <aside className="hidden lg:flex w-56 flex-col border-r border-border-subtle bg-surface shrink-0 fixed inset-y-0 left-0 z-40 overflow-y-auto">

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-[18px] border-b border-border-subtle">
          <div className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
               style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <path d="M8 2L14 14H2L8 2Z" fill="white"/>
            </svg>
          </div>
          <span className="font-semibold text-[15px] text-fg-primary tracking-tight">Pranix</span>
          <span className="ml-0.5 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold bg-accent-subtle text-accent">Founder</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2.5 space-y-0.5">
          {SIDEBAR_NAV.map((item) => (
            <Link key={item.label} href={item.href}
                  className="group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-fg-muted hover:bg-elevated hover:text-fg-primary transition-colors">
              <item.icon className="h-4 w-4 shrink-0 text-fg-disabled group-hover:text-fg-muted" />
              <span className="flex-1 leading-none">{item.label}</span>
              {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && (
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none bg-severity-critical/20 text-severity-critical">
                  {item.badge}
                </span>
              )}
              {'badge' in item && item.badge === 0 && (
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none bg-elevated text-fg-disabled">0</span>
              )}
              {'badgeText' in item && item.badgeText && (
                <span className="rounded px-1 py-0.5 text-[9px] font-bold leading-none bg-accent-subtle text-accent">{item.badgeText}</span>
              )}
              {'chevron' in item && item.chevron && (
                <ChevronDown className="h-3 w-3 text-fg-disabled" />
              )}
            </Link>
          ))}
        </nav>

        {/* System Mode */}
        <div className="border-t border-border-subtle px-3.5 py-3">
          <p className="text-[10px] uppercase tracking-widest text-fg-disabled font-medium mb-2">System Mode</p>
          <div className="flex items-center gap-2 mb-2.5">
            <ShieldCheck className="h-4 w-4 text-severity-success shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-fg-primary leading-none">Normal</p>
              <p className="text-[11px] text-fg-disabled mt-0.5">All systems operational</p>
            </div>
          </div>
          <button className="w-full rounded-md py-1.5 text-[12px] font-medium text-white transition-colors"
                  style={{ background: '#3b82f6' }}>
            Change Mode
          </button>
        </div>

        {/* Next Digest */}
        <div className="border-t border-border-subtle px-3.5 py-3">
          <p className="text-[10px] uppercase tracking-widest text-fg-disabled font-medium mb-2">Next Digest</p>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-accent shrink-0" />
            <div>
              <p className="text-[12px] text-fg-secondary leading-none">Daily at 05:00 AM IST</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">

        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border-subtle bg-surface/90 backdrop-blur-sm px-4 lg:px-6">
          {/* Mobile: Pranix badge */}
          <Link href="/founder" className="lg:hidden flex items-center gap-2">
            <span className="font-semibold text-[15px]">Pranix</span>
            <span className="rounded-sm px-1.5 py-0.5 text-[10px] font-semibold bg-accent-subtle text-accent">Founder</span>
          </Link>

          <div className="flex-1" />

          {/* System status pill */}
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border-subtle bg-canvas px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-severity-success" />
            <span className="text-[11px] text-fg-muted">System Status</span>
            <span className="text-[11px] font-medium text-severity-success">Healthy</span>
          </div>

          <button className="relative p-2 rounded-lg hover:bg-elevated transition-colors text-fg-muted hover:text-fg-primary">
            <Sun className="h-4 w-4" />
          </button>

          <Link href="/founder/alerts" className="relative p-2 rounded-lg hover:bg-elevated transition-colors text-fg-muted hover:text-fg-primary">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white bg-severity-critical">27</span>
          </Link>

          <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-elevated cursor-pointer transition-colors">
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                 style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>F</div>
            <div className="hidden sm:block text-left">
              <p className="text-[12px] font-medium text-fg-primary leading-none">Founder</p>
              <p className="text-[11px] text-fg-muted mt-0.5">founder@pranixailabs.com</p>
            </div>
            <ChevronDown className="hidden sm:block h-3 w-3 text-fg-disabled" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-16 lg:pb-6 overflow-x-hidden">
          {children}
        </main>

        {/* Bottom action bar (desktop) */}
        <footer className="hidden lg:flex items-center gap-2 border-t border-border-subtle bg-surface px-6 py-2.5">
          {[
            { label: 'New Task', icon: '＋' },
            { label: 'Send Message', icon: '↗' },
            { label: 'Request Approval', icon: '⊙' },
            { label: 'View Digest', icon: '◻' },
          ].map(btn => (
            <button key={btn.label}
                    className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-elevated px-3.5 py-1.5 text-[12px] font-medium text-fg-secondary hover:text-fg-primary hover:bg-canvas transition-colors">
              <span className="text-[13px]">{btn.icon}</span>
              {btn.label}
            </button>
          ))}
          <div className="flex-1" />
          <button className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: '#3b82f6' }}>
            <Activity className="h-3.5 w-3.5" />
            System Snapshot
          </button>
        </footer>

        {/* Footer note */}
        <div className="hidden lg:block px-6 py-1.5 border-t border-border-subtle">
          <p className="text-[10px] text-fg-disabled">© 2025 Pranix AI Labs · All systems operational</p>
        </div>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t border-border-subtle bg-surface/95 backdrop-blur-sm lg:hidden">
        {BOTTOM_NAV.map((item) => (
          <Link key={item.href} href={item.href}
                className="flex flex-col items-center gap-0.5 px-2 py-1 text-fg-muted hover:text-fg-primary transition-colors">
            <item.icon className="h-5 w-5" />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
