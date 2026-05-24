import type { Metadata } from 'next'
import { getWorkerStats, getRecentWorkerRuns } from '@/lib/queries'
import { Activity, Clock, CheckCircle, XCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Workers' }
export const revalidate = 30

export default async function FounderWorkersPage() {
  const [stats, recentRuns] = await Promise.all([
    getWorkerStats(),
    getRecentWorkerRuns(30),
  ])

  const lastHeartbeat = stats.lastRun?.completed_at
    ? Math.round((Date.now() - new Date(stats.lastRun.completed_at).getTime()) / 1000)
    : null

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-lg font-semibold text-fg-primary">Worker Topology</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border border-border-subtle bg-surface p-3">
          <div className="text-lg font-semibold text-fg-primary" data-numeric>
            {stats.totalRuns.toLocaleString()}
          </div>
          <div className="text-xs text-fg-muted">Total runs</div>
        </div>
        <div className="rounded-md border border-border-subtle bg-surface p-3">
          <div className={`text-lg font-semibold ${lastHeartbeat !== null && lastHeartbeat < 180 ? 'text-severity-success' : 'text-severity-warn'}`} data-numeric>
            {lastHeartbeat !== null ? `${lastHeartbeat}s` : '\u2014'}
          </div>
          <div className="text-xs text-fg-muted">Last heartbeat</div>
        </div>
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface p-4">
        <h2 className="text-sm font-medium text-fg-primary mb-3">Last 100 Runs</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="text-fg-muted">Completed</div>
          <div className="text-fg-secondary">{stats.recentCompleted}</div>
          <div className="text-fg-muted">Failed</div>
          <div className={stats.recentFailed > 0 ? 'text-severity-error' : 'text-fg-secondary'}>{stats.recentFailed}</div>
          <div className="text-fg-muted">Tasks processed</div>
          <div className="text-fg-secondary" data-numeric>{stats.recentTasksProcessed.toLocaleString()}</div>
          <div className="text-fg-muted">Tasks failed</div>
          <div className={stats.recentTasksFailed > 0 ? 'text-severity-warn' : 'text-fg-secondary'} data-numeric>{stats.recentTasksFailed}</div>
        </div>
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface p-4">
        <h2 className="text-sm font-medium text-fg-primary mb-3">Worker Tiers</h2>
        <div className="space-y-3">
          {TIERS.map((tier) => (
            <div key={tier.name} className="flex items-start gap-3">
              <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${tier.statusColor}`} />
              <div>
                <div className="text-xs font-medium text-fg-primary">{tier.name}</div>
                <div className="text-xs text-fg-muted">{tier.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface p-4">
        <h2 className="text-sm font-medium text-fg-primary mb-3">Recent Runs</h2>
        <div className="space-y-2">
          {recentRuns.slice(0, 15).map((run) => (
            <div key={run.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                {run.status === 'completed' ? (
                  <CheckCircle className="h-3 w-3 text-severity-success shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 text-severity-error shrink-0" />
                )}
                <span className="font-mono text-fg-muted truncate">
                  {run.locked_by || 'worker'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-fg-disabled shrink-0">
                <span data-numeric>{run.tasks_processed}\u2191 {run.tasks_failed}\u2717</span>
                <span>{new Date(run.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-fg-disabled">
        <Clock className="h-3 w-3" />
        <span>Refreshes every 30 seconds</span>
      </div>
    </div>
  )
}

const TIERS = [
  { name: 'Tier 0 \u2014 Vercel Cron', description: '60s tick, lightweight task claiming', statusColor: 'bg-severity-success' },
  { name: 'Tier 1 \u2014 Supabase Edge Function', description: '2min tick, heavy task processing', statusColor: 'bg-severity-success' },
  { name: 'Tier 2 \u2014 Fly.io Browser Worker', description: 'Playwright automation, not yet deployed', statusColor: 'bg-fg-disabled' },
]
