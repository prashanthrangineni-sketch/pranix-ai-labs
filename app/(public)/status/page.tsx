import type { Metadata } from 'next'
import { getProductHealth, getWorkerStats, getAlertCounts } from '@/lib/queries'
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Status',
  description: 'Operational status of Pranix AI Labs infrastructure and products.',
}

export const revalidate = 60

export default async function StatusPage() {
  const [products, workerStats, alertCounts] = await Promise.all([
    getProductHealth(),
    getWorkerStats(),
    getAlertCounts(),
  ])

  const activeProducts = products.filter(
    p => p.account_tier === 'primary' || p.account_tier === 'secondary'
  )

  const lastHeartbeat = workerStats.lastRun?.completed_at
    ? Math.round((Date.now() - new Date(workerStats.lastRun.completed_at).getTime()) / 1000)
    : null

  const workerFresh = lastHeartbeat !== null && lastHeartbeat < 180
  const hasCritical = alertCounts.critical > 0
  const allHealthy = !hasCritical && workerFresh

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <h1 className="text-xl font-semibold md:text-2xl">Operational Status</h1>
      <p className="mt-2 text-sm text-fg-secondary">
        Live infrastructure health from the Pranix control plane.
      </p>

      <div className="mt-10 rounded-lg border border-border-subtle bg-surface p-5">
        <div className="flex items-center gap-3">
          {allHealthy ? (
            <CheckCircle className="h-5 w-5 text-severity-success" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-severity-warn" />
          )}
          <span className="text-base font-medium text-fg-primary">
            {allHealthy ? 'All systems operational' : 'Some systems need attention'}
          </span>
        </div>
        {hasCritical && (
          <p className="mt-2 text-xs text-severity-warn">
            {alertCounts.critical} critical signal{alertCounts.critical !== 1 ? 's' : ''} under investigation.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-border-subtle bg-surface p-5">
        <h2 className="text-sm font-semibold text-fg-primary">Worker Health</h2>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${workerFresh ? 'bg-severity-success' : 'bg-severity-warn'}`} />
              <span className="text-xs text-fg-secondary">
                Last heartbeat: {lastHeartbeat !== null ? `${lastHeartbeat}s ago` : 'Unknown'}
              </span>
            </div>
          </div>
          <div>
            <span className="text-xs text-fg-secondary">
              {workerStats.totalRuns.toLocaleString()} total worker runs
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border-subtle bg-surface p-5">
        <h2 className="text-sm font-semibold text-fg-primary">Product Status</h2>
        <div className="mt-3 space-y-3">
          {activeProducts
            .filter(p => p.product_type !== 'infrastructure')
            .map((p) => (
              <div key={p.project_name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      p.deployment_health === 'healthy'
                        ? 'bg-severity-success'
                        : p.deployment_health === 'degraded'
                          ? 'bg-severity-warn'
                          : 'bg-fg-disabled'
                    }`}
                  />
                  <span className="text-sm text-fg-primary">{p.project_name}</span>
                </div>
                <span className="text-xs text-fg-muted">
                  {p.deployment_health || 'Unknown'}
                </span>
              </div>
            ))}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border-subtle bg-surface p-5">
        <h2 className="text-sm font-semibold text-fg-primary">Infrastructure</h2>
        <div className="mt-3 space-y-2 text-xs text-fg-secondary">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-severity-success" />
            MCP Gateway \u2014 operational
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${workerFresh ? 'bg-severity-success' : 'bg-severity-warn'}`} />
            Worker topology \u2014 {workerFresh ? 'active' : 'stale heartbeat'}
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-severity-success" />
            Control plane \u2014 operational
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-1 text-xs text-fg-disabled">
        <Clock className="h-3 w-3" />
        <span>
          Updated {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          {' \u00b7 '}Refreshes every 60 seconds
        </span>
      </div>
    </div>
  )
}
