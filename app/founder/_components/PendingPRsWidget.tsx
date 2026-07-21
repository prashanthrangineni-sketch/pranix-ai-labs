'use client'

import React from 'react'
import { GitPullRequest, ExternalLink, GitBranch, User, Clock, ShieldAlert } from 'lucide-react'
import type { PendingPR } from '@/lib/queries'

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function PendingPRsWidget({ prs }: { prs: PendingPR[] }) {
  if (!prs || prs.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface p-4 text-center">
        <GitPullRequest className="h-5 w-5 text-fg-disabled mx-auto mb-1.5" />
        <p className="text-[12px] text-fg-muted">No pending Pull Requests awaiting decision across watched repositories.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <GitPullRequest className="h-4 w-4 text-accent" />
          <span className="text-[12px] font-semibold text-fg-primary uppercase tracking-wide">
            Pending Pull Requests ({prs.length})
          </span>
        </div>
        <span className="text-[11px] text-severity-warn font-medium px-2 py-0.5 rounded bg-severity-warn/10">
          Awaiting Founder Decision (HOLD)
        </span>
      </div>

      <div className="p-4 divide-y divide-border-subtle">
        {prs.map(pr => (
          <div key={pr.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-accent bg-accent-subtle px-2 py-0.5 rounded font-mono">
                  {pr.repo}
                </span>
                {pr.isDraft ? (
                  <span className="text-[10px] font-semibold text-severity-warn bg-severity-warn/15 border border-severity-warn/30 px-1.5 py-0.5 rounded uppercase">
                    HOLD / Draft
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-severity-success bg-severity-success/15 border border-severity-success/30 px-1.5 py-0.5 rounded uppercase">
                    Ready to Review
                  </span>
                )}
                <span className="text-[11px] text-fg-disabled">
                  #{pr.number}
                </span>
              </div>

              <h4 className="text-[13px] font-medium text-fg-primary leading-tight truncate">
                {pr.title}
              </h4>

              <div className="flex items-center gap-3 text-[11px] text-fg-muted">
                <span className="flex items-center gap-1 font-mono text-fg-disabled">
                  <GitBranch className="h-3 w-3" /> {pr.headBranch}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3 text-fg-disabled" /> {pr.author}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-fg-disabled" /> {relTime(pr.updatedAt)}
                </span>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <a
                href={pr.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:text-accent/80 bg-accent-subtle hover:bg-accent-subtle/80 px-3 py-1.5 rounded-lg border border-accent/20 transition-colors"
              >
                Review on GitHub <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PendingPRsWidget
