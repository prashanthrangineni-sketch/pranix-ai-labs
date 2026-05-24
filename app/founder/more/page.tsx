import type { Metadata } from 'next'
import Link from 'next/link'
import { Activity, Database, Cpu, FileText, LogOut, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'More' }

const LINKS = [
  { label: 'Workers', href: '/founder/workers', icon: Activity, description: 'Worker topology, recent runs, heartbeat' },
  { label: 'Execution Memory', href: '/founder/memory', icon: Database, description: 'Persisted checkpoints and state across projects' },
  { label: 'Inference', href: '/founder/inference', icon: Cpu, description: 'Cost summary and tier health (Phase 2)' },
  { label: 'Architecture Docs', href: 'https://github.com/prashanthrangineni-sketch/pranix-ai-labs/tree/main/docs/architecture', icon: FileText, description: 'System architecture and design decisions', external: true },
]

export default function FounderMorePage() {
  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-lg font-semibold text-fg-primary">More</h1>

      <div className="space-y-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface p-4 transition-colors duration-fast hover:bg-elevated"
          >
            <link.icon className="h-5 w-5 text-fg-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-fg-primary">{link.label}</div>
              <div className="text-xs text-fg-muted mt-0.5">{link.description}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-fg-disabled shrink-0" />
          </Link>
        ))}
      </div>

      <div className="pt-4 border-t border-border-subtle">
        <Link
          href="/founder/login"
          className="flex items-center gap-2 text-xs text-fg-muted hover:text-fg-secondary transition-colors duration-fast"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out / Switch account
        </Link>
      </div>
    </div>
  )
}
