import type { Metadata } from 'next'
import { Shield, AlertTriangle, CheckCircle, Package, FileText } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Overview',
}

export default function FounderOverviewPage() {
  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-severity-success" />
        <span className="text-sm font-medium text-fg-primary">
          Pranix is operational.
        </span>
      </div>
      <p className="mt-1 text-xs text-fg-muted">
        Dashboard data will be populated from the control plane in Phase 1.
      </p>

      <div className="mt-8 space-y-4">
        {OVERVIEW_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-lg border border-border-subtle bg-surface p-4"
          >
            <div className="flex items-center gap-2">
              <section.icon className="h-4 w-4 text-fg-muted" />
              <h2 className="text-sm font-medium text-fg-primary">
                {section.title}
              </h2>
            </div>
            <p className="mt-2 text-xs text-fg-muted">
              {section.description}
            </p>
            <p className="mt-1 text-xs text-fg-disabled">
              Source: {section.source}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

const OVERVIEW_SECTIONS = [
  { title: 'Critical Signals', description: 'Critical-level alerts requiring founder attention. Grouped by source, deduplicated.', source: "founder_alerts WHERE level = 'critical'", icon: AlertTriangle },
  { title: 'Pending Approvals', description: 'MCP access grants awaiting founder approval. One-tap approve or deny.', source: 'mcp_access_grants WHERE granted_at IS NULL', icon: Shield },
  { title: 'Failure Patterns', description: 'Top recurring failure patterns across all products by occurrence count.', source: "failure_patterns WHERE status = 'open'", icon: AlertTriangle },
  { title: 'Product Health', description: 'Per-product operational state with open findings count and last audit timestamp.', source: 'v_infra_topology', icon: Package },
  { title: 'Recent Digest', description: 'Latest founder digest with operational summary.', source: 'founder_digest_log ORDER BY digest_date DESC LIMIT 1', icon: FileText },
  { title: 'Quick Actions', description: 'Orchestrate a prompt, run a smoke test, view the task queue.', source: 'n/a — action shortcuts', icon: CheckCircle },
] as const
