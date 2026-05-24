import type { Metadata } from 'next'
import { AlertTriangle, Shield, Package, FileText, Activity, Clock } from 'lucide-react'
import {
  getSystemPulse,
  getCriticalAlerts,
  getFailurePatterns,
  getProductHealth,
  getPendingGrants,
  getLatestDigest,
} from '@/lib/queries'

export const metadata: Metadata = { title: 'Overview' }
export const revalidate = 60

export default async function FounderOverviewPage() {
  const [pulse, criticalAlerts, patterns, products, grants, digest] = await Promise.all([
    getSystemPulse(),
    getCriticalAlerts(),
    getFailurePatterns(),
    getProductHealth(),
    getPendingGrants(),
    getLatestDigest(),
  ])

  const activeProducts = products.filter(
    p => p.account_tier === 'primary' || p.account_tier === 'secondary'
  )

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${pulse.isOperational ? 'bg-severity-success' : 'bg-severity-warn'}`} />
        <span className="text-sm font-medium text-fg-primary">
          {pulse.isOperational
            ? 'Pranix is operational.'
            : `${pulse.needsAttention} signal${pulse.needsAttention !== 1 ? 's' : ''} need attention.`}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Completed" value={pulse.taskCounts.completed} />
        <MetricCard label="Dead" value={pulse.taskCounts.dead} variant={pulse.taskCounts.dead > 0 ? 'warn' : 'default'} />
        <MetricCard label="Critical" value={pulse.alertCounts.critical} variant={pulse.alertCounts.critical > 0 ? 'critical' : 'default'} />
      </div>

      {criticalAlerts.length > 0 && (
        <Section icon={AlertTriangle} title={`Critical Signals (${criticalAlerts.length})`}>
          <div className="space-y-2">
            {criticalAlerts.map((alert: any) => (
              <div key={alert.id} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-severity-critical" />
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-fg-secondary">{alert.source}</span>
                  <span className="ml-2 text-fg-muted">
                    {new Date(alert.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {grants.length > 0 && (
        <Section icon={Shield} title={`Pending Approvals (${grants.length})`}>
          <div className="space-y-2">
            {grants.map((grant) => (
              <div key={grant.id} className="text-xs">
                <div className="font-mono text-fg-secondary truncate">{grant.resource_pattern}</div>
                <div className="text-fg-muted mt-0.5">
                  {grant.scope} · expires {new Date(grant.expires_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {patterns.length > 0 && (
        <Section icon={Activity} title="Failure Patterns">
          <div className="space-y-2">
            {patterns.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <span className="text-fg-secondary truncate max-w-[70%]">{p.fingerprint}</span>
                <span className="font-mono text-fg-muted" data-numeric>{p.occurrences}x</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section icon={Package} title="Product Health">
        <div className="grid grid-cols-2 gap-2">
          {activeProducts.map((p) => (
            <div key={p.project_name} className="rounded-md border border-border-subtle bg-canvas p-3">
              <div className="text-xs font-medium text-fg-primary">{p.project_name}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-fg-muted">
                <span>{p.open_findings} finding{p.open_findings !== 1 ? 's' : ''}</span>
                {p.last_audit_at && (
                  <span>· {new Date(p.last_audit_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                )}
              </div>
              {p.deployment_health && <StatusPill status={p.deployment_health} />}
            </div>
          ))}
        </div>
      </Section>

      <Section icon={FileText} title="Recent Digest">
        {digest ? (
          <DigestContent digest={digest} />
        ) : (
          <p className="text-xs text-fg-muted">No recent digest.</p>
        )}
      </Section>

      <div className="flex items-center gap-1 text-xs text-fg-disabled">
        <Clock className="h-3 w-3" />
        <span>Refreshed {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────

function DigestContent({ digest }: { digest: { digest_date: string; digest_content: any } }) {
  const content = digest.digest_content
  if (!content || typeof content !== 'object') {
    return <p className="text-xs text-fg-muted">Empty digest.</p>
  }

  const actions: string[] = content.top_actions || []
  const prs = content.pending_prs || { count: 0 }
  const crons: any[] = content.failed_crons || []

  return (
    <div className="text-xs space-y-2">
      <div className="font-mono text-fg-muted">
        {new Date(digest.digest_date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>

      {actions.length > 0 && (
        <div>
          <div className="text-fg-muted mb-1">Top actions</div>
          <div className="space-y-1">
            {actions.slice(0, 3).map((action, i) => (
              <div key={i} className="text-fg-secondary">{action}</div>
            ))}
          </div>
        </div>
      )}

      {prs.count > 0 && (
        <div className="text-fg-secondary">
          {prs.count} pending PR{prs.count !== 1 ? 's' : ''}
        </div>
      )}

      {crons.length > 0 && (
        <div>
          <div className="text-severity-warn">{crons.length} failed cron{crons.length !== 1 ? 's' : ''}</div>
        </div>
      )}

      {actions.length === 0 && prs.count === 0 && crons.length === 0 && (
        <div className="text-fg-muted">No notable items.</div>
      )}
    </div>
  )
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-fg-muted" />
        <h2 className="text-sm font-medium text-fg-primary">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function MetricCard({ label, value, variant = 'default' }: { label: string; value: number; variant?: 'default' | 'warn' | 'critical' }) {
  const valueColor = variant === 'critical' ? 'text-severity-critical' : variant === 'warn' ? 'text-severity-warn' : 'text-fg-primary'
  return (
    <div className="rounded-md border border-border-subtle bg-surface p-3">
      <div className={`text-lg font-semibold ${valueColor}`} data-numeric>{value.toLocaleString()}</div>
      <div className="text-xs text-fg-muted">{label}</div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const color = status === 'healthy' ? 'bg-severity-success/12 text-severity-success border-severity-success/20'
    : status === 'degraded' ? 'bg-severity-warn/12 text-severity-warn border-severity-warn/20'
    : 'bg-fg-disabled/12 text-fg-disabled border-fg-disabled/20'
  return <span className={`mt-1.5 inline-block rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${color}`}>{status}</span>
}
