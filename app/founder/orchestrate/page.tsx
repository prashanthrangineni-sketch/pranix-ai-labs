import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase'
import { Cpu, Clock, CheckCircle2, AlertTriangle, Circle } from 'lucide-react'

export const metadata: Metadata = { title: 'Orchestration' }
export const revalidate = 60

// ─── Data fetching ────────────────────────────────────────────────

async function getTasksByTier(): Promise<Record<string, number>> {
  const db = createServerClient()
  const { data } = await db
    .from('tasks')
    .select('tier')
    .not('tier', 'is', null)

  const counts: Record<string, number> = {}
  for (const row of data || []) {
    const key = String(row.tier)
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

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
    const { data } = await db
      .from('inference_log')
      .select('cost_usd, tokens_in, tokens_out, success')
    if (!data || data.length === 0) return null
    const total_calls = data.length
    const total_cost = data.reduce((s, r) => s + (r.cost_usd || 0), 0)
    const total_tokens = data.reduce((s, r) => s + (r.tokens_in || 0) + (r.tokens_out || 0), 0)
    const success_rate = data.filter(r => r.success).length / total_calls
    return { total_calls, total_cost, total_tokens, success_rate }
  } catch {
    return null
  }
}

// ─── Page ────────────────────────────────────────────────────────

export default async function FounderOrchestratePage() {
  const [tasksByTier, recentCalls, totals] = await Promise.all([
    getTasksByTier(),
    getRecentInferenceCalls(),
    getInferenceTotals(),
  ])

  const hasInferenceCalls = recentCalls.length > 0

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Cpu className="h-5 w-5 text-fg-muted" />
        <h1 className="text-lg font-semibold text-fg-primary">Orchestration</h1>
      </div>

      {/* Tier configuration */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium text-fg-muted">Inference Tiers</h2>
          <span className="text-[10px] text-fg-disabled">Configuration — not live telemetry</span>
        </div>
        <div className="space-y-2">
          <TierCard
            tier="T0"
            name="Deterministic"
            description="Rule-based routing, no LLM call"
            status="active"
            note="Always available"
          />
          <TierCard
            tier="T1"
            name="Ollama / NVIDIA NIM"
            description="Local or GPU-accelerated inference"
            status="config-missing"
            note="NVIDIA_API_KEY not set in engine env"
          />
          <TierCard
            tier="T2"
            name="Anthropic Claude"
            description="Premium reasoning via Claude API"
            status="config-missing"
            note="PMCP_ANTHROPIC_API_KEY not set in engine env"
          />
          <TierCard
            tier="T3"
            name="Browser Worker"
            description="Playwright automation on Fly.io"
            status="not-deployed"
            note="Fly.io VM not yet provisioned"
          />
        </div>
      </section>

      {/* Task distribution by tier — real DB */}
      <section className="space-y-2">
        <h2 className="text-xs font-medium text-fg-muted">Task Distribution by Tier</h2>
        <div className="rounded-lg border border-border-subtle bg-surface p-4">
          {Object.keys(tasksByTier).length === 0 ? (
            <p className="text-xs text-fg-muted">No tier data on tasks yet.</p>
          ) : (
            <div className="space-y-2">
              {TIER_LABELS.map(({ key, label }) => {
                const count = tasksByTier[key] || 0
                const total = Object.values(tasksByTier).reduce((a, b) => a + b, 0)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-fg-secondary">{label}</span>
                      <span className="font-mono text-fg-primary" data-numeric>
                        {count.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-elevated overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${pct}%` }}
                      />
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
            <div className="px-4 py-5 space-y-1">
              <p className="text-xs text-fg-muted">No inference calls logged yet.</p>
              <p className="text-[11px] text-fg-disabled">
                Calls will appear here once NVIDIA_API_KEY and
                PMCP_ANTHROPIC_API_KEY are set on the engine Vercel project
                and the inference router processes its first task.
              </p>
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
                      {call.latency_ms !== null && (
                        <span data-numeric>{call.latency_ms}ms</span>
                      )}
                      {call.cost_usd !== null && (
                        <span data-numeric>${call.cost_usd.toFixed(5)}</span>
                      )}
                      <span className="text-fg-disabled">
                        {new Date(call.created_at).toLocaleString('en-IN', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
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

      {/* Pending configuration */}
      <section className="space-y-2">
        <h2 className="text-xs font-medium text-fg-muted">Pending Configuration</h2>
        <div className="rounded-lg border border-border-subtle bg-surface p-4 space-y-3">
          <ConfigItem
            done={false}
            label="NVIDIA_API_KEY"
            detail="Engine Vercel env — enables T1 NVIDIA NIM tier"
          />
          <ConfigItem
            done={false}
            label="PMCP_ANTHROPIC_API_KEY"
            detail="Engine Vercel env — enables T2 Anthropic tier"
          />
          <ConfigItem
            done={false}
            label="Fly.io browser worker"
            detail="Oracle VM provisioning pending — enables T3 Playwright automation"
          />
          <ConfigItem
            done={true}
            label="T0 deterministic router"
            detail="Always active — no env vars required"
          />
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

const TIER_LABELS = [
  { key: '0', label: 'T0 — Deterministic' },
  { key: '1', label: 'T1 — Ollama / NVIDIA' },
  { key: '2', label: 'T2 — Anthropic' },
  { key: '3', label: 'T3 — Browser Worker' },
]

type TierStatus = 'active' | 'config-missing' | 'not-deployed'

function TierCard({
  tier, name, description, status, note,
}: {
  tier: string
  name: string
  description: string
  status: TierStatus
  note: string
}) {
  const dotClass =
    status === 'active'
      ? 'bg-severity-success'
      : status === 'config-missing'
      ? 'bg-severity-warn'
      : 'bg-fg-disabled'

  const Icon =
    status === 'active'
      ? CheckCircle2
      : status === 'config-missing'
      ? AlertTriangle
      : Circle

  const iconClass =
    status === 'active'
      ? 'text-severity-success'
      : status === 'config-missing'
      ? 'text-severity-warn'
      : 'text-fg-disabled'

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface p-3">
      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-fg-primary">
            {tier} — {name}
          </span>
          <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass}`} />
        </div>
        <p className="text-[11px] text-fg-muted mt-0.5">{description}</p>
        <p className="text-[10px] text-fg-disabled mt-0.5">{note}</p>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface p-3">
      <div className="text-sm font-semibold text-fg-primary" data-numeric>{value}</div>
      <div className="text-[10px] text-fg-muted mt-0.5">{label}</div>
    </div>
  )
}

function ConfigItem({
  done, label, detail,
}: {
  done: boolean
  label: string
  detail: string
}) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm border text-[9px] flex items-center justify-center font-bold ${done ? 'border-severity-success text-severity-success' : 'border-border-strong text-fg-disabled'}`}>
        {done ? '✓' : ''}
      </span>
      <div className="min-w-0">
        <div className="text-xs font-mono text-fg-primary">{label}</div>
        <div className="text-[10px] text-fg-muted">{detail}</div>
      </div>
    </div>
  )
}
