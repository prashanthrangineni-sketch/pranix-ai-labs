import type { Metadata } from 'next'
import { getProductHealth } from '@/lib/queries'
import { ExternalLink, Clock } from 'lucide-react'

export const metadata: Metadata = { title: 'Products' }
export const revalidate = 300

export default async function FounderProductsPage() {
  const products = await getProductHealth()
  const active = products.filter(p => !['placeholder', 'incubation'].includes(p.account_tier))
  const placeholders = products.filter(p => ['placeholder', 'incubation'].includes(p.account_tier))

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-lg font-semibold text-fg-primary">Product Health</h1>
      <p className="text-xs text-fg-muted">From v_infra_topology · {active.length} active products</p>

      <div className="space-y-3">
        {active.map((p) => (
          <div key={p.project_name} className="rounded-lg border border-border-subtle bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-fg-primary">{p.project_name}</h2>
              {p.url && (
                <a href={`https://${p.url}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors duration-fast">
                  {p.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="text-fg-muted">Type</div>
              <div className="text-fg-secondary">{p.product_type}</div>
              <div className="text-fg-muted">Tier</div>
              <div className="text-fg-secondary">{p.account_tier}</div>
              <div className="text-fg-muted">Open findings</div>
              <div className={p.open_findings > 0 ? 'text-severity-warn' : 'text-fg-secondary'}>{p.open_findings}</div>
              <div className="text-fg-muted">Last audit</div>
              <div className="text-fg-secondary">
                {p.last_audit_at ? new Date(p.last_audit_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
              </div>
              <div className="text-fg-muted">Deploy health</div>
              <div className="text-fg-secondary">{p.deployment_health || 'Unknown'}</div>
            </div>
            {p.github_repo && <div className="mt-2 text-xs font-mono text-fg-disabled truncate">{p.github_repo}</div>}
          </div>
        ))}
      </div>

      {placeholders.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-fg-muted mt-6">Incubation / Placeholder</h2>
          <div className="space-y-2">
            {placeholders.map((p) => (
              <div key={p.project_name} className="rounded-md border border-border-subtle bg-surface/50 p-3 text-xs text-fg-muted">
                {p.project_name} · {p.product_type}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center gap-1 text-xs text-fg-disabled pt-2">
        <Clock className="h-3 w-3" />
        <span>Refreshes every 5 minutes</span>
      </div>
    </div>
  )
}
