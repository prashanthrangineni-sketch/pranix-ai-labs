import type { Metadata } from 'next'
import { getFailurePatterns, getAlertCounts } from '@/lib/queries'
import { AlertTriangle, Clock } from 'lucide-react'

export const metadata: Metadata = { title: 'Alerts' }
export const revalidate = 60

export default async function FounderAlertsPage() {
  const [patterns, counts] = await Promise.all([
    getFailurePatterns(),
    getAlertCounts(),
  ])

  const total = counts.critical + counts.error + counts.warn + counts.info

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-lg font-semibold text-fg-primary">Alerts</h1>

      <div className="grid grid-cols-4 gap-2">
        <CountBadge label="Critical" value={counts.critical} variant="critical" />
        <CountBadge label="Error" value={counts.error} variant="error" />
        <CountBadge label="Warn" value={counts.warn} variant="warn" />
        <CountBadge label="Info" value={counts.info} variant="info" />
      </div>

      <p className="text-xs text-fg-muted">
        {total.toLocaleString()} total alerts \u00b7 default view shows failure patterns, not raw alerts
      </p>

      <div className="rounded-lg border border-border-subtle bg-surface p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-fg-muted" />
          <h2 className="text-sm font-medium text-fg-primary">
            Open Failure Patterns ({patterns.length})
          </h2>
        </div>

        {patterns.length > 0 ? (
          <div className="space-y-3">
            {patterns.map((p) => (
              <div key={p.id} className="border-b border-border-subtle pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-fg-primary truncate max-w-[65%]">
                    {p.fingerprint}
                  </span>
                  <span className="text-xs font-mono text-severity-warn" data-numeric>
                    {p.occurrences}\u00d7
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-fg-muted">
                  {p.product_name && <span>{p.product_name}</span>}
                  <span>\u00b7 {p.failure_type}</span>
                  <span>
                    \u00b7 last {new Date(p.last_seen_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-fg-muted">No open failure patterns.</p>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-fg-disabled">
        <Clock className="h-3 w-3" />
        <span>Refreshes every 60 seconds</span>
      </div>
    </div>
  )
}

function CountBadge({
  label,
  value,
  variant,
}: {
  label: string
  value: number
  variant: 'critical' | 'error' | 'warn' | 'info'
}) {
  const colors = {
    critical: 'border-severity-critical/20 text-severity-critical',
    error: 'border-severity-error/20 text-severity-error',
    warn: 'border-severity-warn/20 text-severity-warn',
    info: 'border-severity-info/20 text-severity-info',
  }

  return (
    <div className={`rounded-md border bg-surface p-2 text-center ${colors[variant]}`}>
      <div className="text-base font-semibold" data-numeric>{value}</div>
      <div className="text-[10px] text-fg-muted">{label}</div>
    </div>
  )
}
