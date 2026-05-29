import type { Metadata } from 'next'
import Link from 'next/link'
import {
  LayoutDashboard, Bot, ListChecks, Bell, ShieldCheck,
  Brain, Monitor, Lock, Activity, Rocket, Package,
  Settings, Network, ChevronDown, Clock, Sparkles, Boxes,
} from 'lucide-react'

export const metadata: Metadata = {
  title: { default: 'Founder', template: '%s — Founder — Pranix' },
  robots: { index: false, follow: false },
}

// Nav items only. No hardcoded counts — a badge is shown only when a real
// count is wired (none are yet, so none are shown). 'NEW' is a static label,
// not telemetry.
const SIDEBAR_NAV = [
  { label: 'Overview',             href: '/founder',              icon: LayoutDashboard },
  { label: 'Ask Pranix',           href: '/founder/ask',          icon: Sparkles,   badgeText: 'NEW' },
  { label: 'Agents',               href: '/founder/workers',      icon: Bot },
  { label: 'Tasks',                href: '/founder/tasks',        icon: ListChecks },
  { label: 'Alerts',               href: '/founder/alerts',       icon: Bell },
  { label: 'Approvals',            href: '/founder/approvals',    icon: ShieldCheck },
  { label: 'Memory',               href: '/founder/memory',       icon: Brain },
  { label: 'Browser Intelligence', href: '/founder/baselines',    icon: Monitor },
  { label: 'Protocols',            href: '/founder/more',         icon: Lock },
  { label: 'Observability',        href: '/founder/more',         icon: Activity },
  { label: 'Deployments',          href: '/founder/more',         icon: Rocket },
  { label: 'Products',             href: '/founder/products',     icon: Package },
  { label: 'Settings',             href: '/founder/more',         icon: Settings },
  { label: 'Orchestration',        href: '/founder/orchestrate',  icon: Network,    badgeText: 'NEW' },
] as const

const BOTTOM_NAV = [
  { label: 'Overview',  href: '/founder',           icon: LayoutDashboard },
  { label: 'Ask',       href: '/founder/ask',       icon: Sparkles },
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
              {'badgeText' in item && item.badgeText && (
                <span className="rounded px-1 py-0.5 text-[9px] font-bold leading-none bg-accent-subtle text-accent">{item.badgeText}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Next Digest — real scheduled founder briefing */}
        <div className="border-t border-border-subtle px-3.5 py-3">
          <p className="text-[10px] uppercase tracking-widest text-fg-disabled font-medium mb-2">Next Digest</p>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-accent shrink-0" />
            <p className="text-[12px] text-fg-secondary leading-none">Daily at 05:00 AM IST</p>
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

          {/* Alerts (real link; badge intentionally omitted until a live count is wired) */}
          <Link href="/founder/alerts" className="relative p-2 rounded-lg hover:bg-elevated transition-colors text-fg-muted hover:text-fg-primary" aria-label="Alerts">
            <Bell className="h-4 w-4" />
          </Link>

          {/* Account — tap to manage password / recovery secret / sign out */}
          <Link href="/founder/account" className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-elevated cursor-pointer transition-colors">
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                 style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>F</div>
            <div className="hidden sm:block text-left">
              <p className="text-[12px] font-medium text-fg-primary leading-none">Founder</p>
              <p className="text-[11px] text-fg-muted mt-0.5">founder@pranixailabs.com</p>
            </div>
            <ChevronDown className="hidden sm:block h-3 w-3 text-fg-disabled" />
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-16 lg:pb-6 overflow-x-hidden">
          {children}
        </main>

        {/* Footer note */}
        <div className="hidden lg:block px-6 py-1.5 border-t border-border-subtle">
          <p className="text-[10px] text-fg-disabled">© 2026 Pranix AI Labs</p>
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
