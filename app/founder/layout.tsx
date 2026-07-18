import type { Metadata } from 'next'
import Link from 'next/link'
import {
  LayoutDashboard, Bot, ListChecks, Bell, ShieldCheck,
  Brain, Monitor, Package,
  ChevronDown, Clock, Sparkles, Boxes, Archive, LayoutGrid, Gauge, Camera, KeyRound, Workflow, BookOpen,
} from 'lucide-react'
import { getFounderSession } from '@/lib/auth'
import { IdeaCaptureHeader } from './_components/IdeaCaptureHeader'

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
  { label: 'Automation',           href: '/founder/automation',   icon: Workflow,   badgeText: 'NEW' },
  { label: 'Alerts',               href: '/founder/alerts',       icon: Bell },
  { label: 'Approvals',            href: '/founder/approvals',    icon: ShieldCheck },
  { label: 'Tokens',               href: '/founder/tokens',       icon: KeyRound,   badgeText: 'NEW' },
  { label: 'Memory',               href: '/founder/memory',       icon: Brain },
  { label: 'Browser Intelligence', href: '/founder/baselines',    icon: Monitor },
  { label: 'Products',             href: '/founder/products',     icon: Package },
  { label: 'Readiness',            href: '/founder/readiness',    icon: Gauge,      badgeText: 'NEW' },
  { label: 'Accounts',             href: '/founder/accounts',     icon: Boxes },
  { label: 'Artifacts',            href: '/founder/artifacts',    icon: Archive,    badgeText: 'NEW' },
  { label: 'Test Evidence',        href: '/founder/evidence',     icon: Camera,     badgeText: 'NEW' },
  { label: 'More',                 href: '/founder/more',         icon: ChevronDown },
  { label: 'AI Workspace',         href: '/founder/workspace',    icon: LayoutGrid, badgeText: 'NEW' },
] as const

const BOTTOM_NAV = [
  { label: 'Overview',  href: '/founder',           icon: LayoutDashboard },
  { label: 'Ask',       href: '/founder/ask',       icon: Sparkles },
  { label: 'Approvals', href: '/founder/approvals', icon: ShieldCheck },
  { label: 'Products',  href: '/founder/products',  icon: Package },
  { label: 'Tasks',     href: '/founder/tasks',     icon: ListChecks },
  { label: 'Alerts',    href: '/founder/alerts',    icon: Bell },
  { label: 'More',      href: '/founder/more',      icon: ChevronDown },
] as const

export default async function FounderLayout({ children }: { children: React.ReactNode }) {
  const session = await getFounderSession()
  if (!session) {
    return <>{children}</>
  }
  const readOnly = session?.role === 'readonly'
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

          {/* Idea Capture Header */}
          <IdeaCaptureHeader />


          {/* Alerts */}
          <Link href="/founder/alerts" className="relative p-2 rounded-lg hover:bg-elevated transition-colors text-fg-muted hover:text-fg-primary" aria-label="Alerts">
            <Bell className="h-5 w-5" />
          </Link>

          {/* User Profile */}
          <div className="flex items-center gap-2 border-l border-border-subtle pl-3">
            <span className="text-[12px] text-fg-secondary font-medium hidden sm:inline">{session?.email}</span>
            {readOnly && (
              <span className="rounded bg-severity-warn/12 px-1.5 py-0.5 text-[9px] font-semibold text-severity-warn">
                Read-only
              </span>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          {children}
        </main>

        {/* Mobile: Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex h-14 border-t border-border-subtle bg-surface/95 backdrop-blur-md px-2">
          {BOTTOM_NAV.map((item) => (
            <Link key={item.label} href={item.href}
                  className="flex flex-1 flex-col items-center justify-center gap-1 text-fg-muted hover:text-fg-primary transition-colors">
              <item.icon className="h-5 w-5" />
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
            </Link>
          ))}
        </nav>

      </div>
    </div>
  )
}
