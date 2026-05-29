import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase'
import { Cpu, Clock } from 'lucide-react'
import ProviderControls from './ProviderControls'

export const metadata: Metadata = { title: 'Orchestration' }
export const revalidate = 60

// ─── Types ────────────────────────────────────────────────────────

type ProviderRow = {
  provider_name: string
  enabled: boolean | null
  tier: number | null
  priority: number | null
  health_status: string | null
  health_checked_at: string | null
}

type ProviderStat = { ok: number; fail: number; last?: string }

type InferenceRow = {
  id: number
  tier: number | null
  model: string | null
  provider: string | null
  tokens_in: number | null
  tokens_out: number | null
  cost_usd: number | null
  latency_ms: number | null
  success: boolean | null
  created_at: string
}

// ─── Data fetching (all runtime, no hardcoded values) ─────────────

async function getProviders(): Promise<ProviderRow[]> {
  try {
    const db = createServerClient()
    const { data, error } = await db
      .from('provider_registry')
      .select('provider_name, enabled, tier, priority, health_status, health_checked_at')
      .order('tier', { ascending: true })
      .order('priority', { ascending: true })
    if (error) return []
    return (data as ProviderRow[]) || []
  } catch {
    return []
  }
}

async function getProviderStats(): Promise<Record<string, ProviderStat>> {
  try {
    const db = createServerClient()
    const { data } = await db
      .from('inference_log')
      .select('provider, success, created_at')
    const m: Record<string, ProviderStat> = {}
    for (const r of (data as { provider: string | null; success: boolean | null; created_at: string }[]) || []) {
      const p = r.provider ?? '—'
      if (!m[p]) m[p] = { ok: 0, fail: 0 }
      if (r.success) {
        m[p].ok++
        if (!m[p].last || r.created_at > m[p].last!) m[p].last = r.created_at
      } else {
        m[p].fail++
      }
    }
    return m
  } catch {
    return {}
  }
}

async function getTasksByTier(): Promise<Record<string, number>> {
  try {
    const db = createServerClient()
    const { data } = await db.from('tasks').select('tier').not('tier', 'is', null)
    const counts: Record<string, number> = {}
    for (const row of data || []) {
      const key = String((row as { tier: number }).tier)
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  } catch {
    return {}
  }
}

async function getRecentInferenceCalls(): Promise<InferenceRow[]> {
  try {
    const db = createServerClient()
    const { data, error } = await db
      .from('inference_log')
      .select('id, tier, model, provider, tokens_in, tokens_out, cost_usd, latency_ms, success, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) return []
    return (data as InferenceRow[]) || []
  } catch {
    return []
  }
}

async function getInferenceTotals() {
  try {
    const db = createServerClient()
    const { data } = await db.from('inference_log').select('cost_usd, tokens_in, tokens_out, success')
    if (!data || data.length === 0) return null
    const total_calls = data.length
    const total_cost = data.reduce((s, r) => s + ((r as InferenceRow).cost_usd || 0), 0)
    const total_tokens = data.reduce(
      (s, r) => s + ((r as InferenceRow).tokens_in || 0) + ((r as InferenceRow).tokens_out || 0),
      0,
    )
    const success_rate = data.filter((r) => (r as InferenceRow).success).length / total_calls
    return { total_calls, total_cost, total_tokens, success_rate }
  } catch {
    return null
  }
}

// ─── Page ────────────────────────────────────────────────────────

const TIER_NAMES: Record<string, string> = {
  '0': 'T0 — Deterministic (no LLM cost)',
  '1': 'T1 — Fast / Free tier',
  '2': 'T2 — Premium reasoning',
  '3': 'T3 — Browser worker',
}

export default async function FounderOrchestratePage() {
  const [providers, stats, tasksByTier, recentCalls, totals] = await Promise.all([
    getProviders(),
    getProviderStats(),
    getTasksByTier(),
    getRecentInferenceCalls(),
    getInferenceTotals(),
  ])

  const hasInferenceCalls = recentCalls.length > 0
  const enabledCount = providers.filter((p) => p.enabled).length

  // Group providers by tier for display
  const byTier: Record<string, ProviderRow[]> = {}
  for (const p of providers) {
    const key = String(p.tier ?? '?')
    if (!byTier[key]) byTier[key] = []
    byTier[key].push(p)
  }
  const tierKeys = Object.keys(byTier).sort()

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Cpu className="h-5 w-5 text-fg-muted" />
        <h1 className="text-lg font-semibold text-fg-primary">Orchestration</h1>
      </div>

      {/* Provider registry — REAL data from provider_registry */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium text-fg-muted">AI Providers</h2>
          <span className="text-[10px] text-fg-disabled">
            {providers.length > 0 ? `${enabledCount} of ${providers.length} enabled` : 'live'}
          </span>
        </div>

        {providers.length === 0 ? (
          <div className="rounded-lg border border-border-subtle bg-surface px-4 py-5 space-y-1">
            <p className="text-xs text-fg-muted">Provider registry not readable by the dashboard client.</p>
            <p className="text-[11px] text-fg-disabled">
              The table exists but this view returned no rows — likely a missing SELECT grant /
              RLS policy on <span className="font-mono">provider_registry</span> for the dashboard
              role. Grant read access (or point this page at the service-role client) and providers
              will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tierKeys.map((tk) => (
              <div key={tk} className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-fg-disabled font-medium">
                  {TIER_NAMES[tk] ?? `Tier ${tk}`}
                </p>
                <ProviderControls providers={byTier[tk]} stats={stats} />
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-fg-disabled pt-1">
          Enable/disable and priority controls write directly to{' '}
          <span className="font-mono">provider_registry</span>. The live router honors these at
          routing time once the engine gate (PR #12 on the agent-engine repo) is merged and
          deployed; until then changes are saved but not yet enforced at inference time.
        </p>
      </section>

      {/* Task distribution by tier — real DB */}
      <section className="space-y-2">
        <h2 className="text-xs font-medium text-fg-muted">Task Distribution by Tier</h2>
        <div className="rounded-lg border border-border-subtle bg-surface p-4">
          {Object.keys(tasksByTier).length === 0 ? (
            <p className="text-xs text-fg-muted">No tier data on tasks yet.</p>
          ) : (
            <div className="space-y-2">
              {Object.keys(tasksByTier)
                .sort()
                .map((key) => {
                  const count = tasksByTier[key] || 0
                  const total = Object.values(tasksByTier).reduce((a, b) => a + b, 0)
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-fg-secondary">{TIER_NAMES[key] ?? `Tier ${key}`}</span>
                        <span className="font-mono text-fg-primary" data-numeric>
                          {count.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-elevated overflow-hidden">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </section>

      {/* Inference totals — real DB */}
      {totals && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium text-fg-muted">Inference Summary (All Time)</h2>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Total calls" value={totals.total_calls.toLocaleString()} />
            <StatCard label="Success rate" value={`${Math.round(totals.success_rate * 100)}%`} />
            <StatCard label="Total tokens" value={totals.total_tokens.toLocaleString()} />
            <StatCard label="Total cost" value={`$${totals.total_cost.toFixed(4)}`} />
          </div>
        </section>
      )}

      {/* Recent calls — real DB */}
      <section className="space-y-2">
        <h2 className="text-xs font-medium text-fg-muted">Recent Inference Calls</h2>
        <div className="rounded-lg border border-border-subtle bg-surface">
          {!hasInferenceCalls ? (
            <div className="px-4 py-5">
              <p className="text-xs text-fg-muted">No inference calls logged yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {recentCalls.map((call) => (
                <li key={call.id} className="flex items-start gap-3 p-3">
                  <span
                    className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${call.success ? 'bg-severity-success' : 'bg-severity-error'}`}
                  />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-fg-primary truncate">
                        {call.provider ?? '—'} / {call.model ?? '—'}
                      </span>
                      <span className="text-[10px] text-fg-disabled shrink-0" data-numeric>
                        T{call.tier ?? '?'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-fg-muted">
                      {call.tokens_in !== null && (
                        <span data-numeric>{(call.tokens_in + (call.tokens_out || 0)).toLocaleString()} tok</span>
                      )}
                      {call.latency_ms !== null && <span data-numeric>{call.latency_ms}ms</span>}
                      {call.cost_usd !== null && <span data-numeric>${call.cost_usd.toFixed(5)}</span>}
                      <span className="text-fg-disabled">
                        {new Date(call.created_at).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="flex items-center gap-1 text-xs text-fg-disabled">
        <Clock className="h-3 w-3" />
        <span>Refreshes every 60 seconds</span>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface p-3">
      <div className="text-sm font-semibold text-fg-primary" data-numeric>
        {value}
      </div>
      <div className="text-[10px] text-fg-muted mt-0.5">{label}</div>
    </div>
  )
}
