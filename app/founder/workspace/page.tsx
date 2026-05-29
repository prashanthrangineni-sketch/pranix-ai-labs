import { getWorkspace } from '@/lib/workspace'
import { Cpu, HeartPulse, Layers, DollarSign, Rocket, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'AI Workspace' }

function Section({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
        <span className="text-fg-muted">{icon}</span>
        <span className="text-[12px] font-semibold text-fg-primary uppercase tracking-wide">{title}</span>
        {sub && <span className="text-[11px] text-fg-disabled ml-auto">{sub}</span>}
      </div>
      <div className="p-4 overflow-x-auto">{children}</div>
    </div>
  )
}

function dot(status: string | null) {
  const s = (status ?? '').toLowerCase()
  if (s === 'ok' || s === 'healthy' || s === 'active') return 'bg-severity-success'
  if (s.includes('offline') || s.includes('billing') || s === 'down') return 'bg-severity-critical'
  if (s.includes('free') || s.includes('configured') || s.includes('degraded')) return 'bg-severity-warn'
  return 'bg-fg-disabled'
}

function fmtUsd(n: number) {
  if (n === 0) return '$0'
  if (n < 0.01) return `$${n.toFixed(4)}`
  return `$${n.toFixed(2)}`
}

function relDate(iso: string | null) {
  if (!iso) return '—'
  const d = Date.now() - new Date(iso).getTime()
  const h = Math.floor(d / 3600000)
  if (h < 1) return `${Math.max(0, Math.floor(d / 60000))}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const TH = 'text-left text-[10px] uppercase tracking-wide text-fg-disabled font-medium pb-2 pr-4'
const TD = 'text-[12px] text-fg-secondary py-1.5 pr-4 align-top'

export default async function WorkspacePage() {
  const w = await getWorkspace()

  // group capabilities by agent
  const capByAgent = new Map<string, typeof w.capabilities>()
  for (const c of w.capabilities) {
    const arr = capByAgent.get(c.agent_name) ?? []
    arr.push(c)
    capByAgent.set(c.agent_name, arr)
  }
  const agents = Array.from(capByAgent.entries())

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-fg-primary tracking-tight">AI Workspace</h1>
        <p className="text-[13px] text-fg-muted mt-1">
          Read-only view across every AI provider, model, capability, and cost. Operational controls
          (activation, routing, budgets) are introduced separately and require approval.
        </p>
      </div>

      {/* Cost summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border-subtle bg-surface p-4">
          <p className="text-[11px] text-fg-muted">Providers</p>
          <p className="text-xl font-bold text-fg-primary tabular-nums">{w.providers.length}</p>
          <p className="text-[11px] text-fg-disabled">{w.providers.filter(p => p.enabled).length} enabled</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface p-4">
          <p className="text-[11px] text-fg-muted">Models</p>
          <p className="text-xl font-bold text-fg-primary tabular-nums">{w.models.length}</p>
          <p className="text-[11px] text-fg-disabled">{w.models.filter(m => m.is_free).length} free</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface p-4">
          <p className="text-[11px] text-fg-muted">Inference calls</p>
          <p className="text-xl font-bold text-fg-primary tabular-nums">{w.costTotals.calls.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-fg-disabled">{fmtUsd(w.costTotals.cost_usd)} total</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface p-4">
          <p className="text-[11px] text-fg-muted">Failures</p>
          <p className={`text-xl font-bold tabular-nums ${w.costTotals.failures > 0 ? 'text-severity-warn' : 'text-fg-primary'}`}>{w.costTotals.failures.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-fg-disabled">across logged calls</p>
        </div>
      </div>

      {w.costTotals.failures > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-severity-warn/30 bg-severity-warn/10 px-3 py-2 text-[12px] text-fg-secondary">
          <AlertTriangle className="h-4 w-4 text-severity-warn shrink-0 mt-0.5" />
          <span>{w.costTotals.failures} logged inference calls failed or exhausted fallbacks. Budget-aware routing controls land in the operational workspace (F.2).</span>
        </div>
      )}

      {/* Provider Matrix */}
      <Section icon={<Cpu className="h-4 w-4" />} title="Provider Matrix" sub={`${w.providers.length} providers`}>
        <table className="w-full min-w-[520px]">
          <thead><tr><th className={TH}>Provider</th><th className={TH}>Tier</th><th className={TH}>Enabled</th><th className={TH}>Priority</th><th className={TH}>Health</th></tr></thead>
          <tbody>
            {w.providers.map(p => (
              <tr key={p.provider_name} className="border-t border-border-subtle">
                <td className={TD}>{p.provider_name}</td>
                <td className={TD}>T{p.tier ?? '—'}</td>
                <td className={TD}>{p.enabled ? 'Yes' : 'No'}</td>
                <td className={TD}>{p.priority ?? '—'}</td>
                <td className={TD}><span className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${dot(p.health_status)}`} />{p.health_status ?? 'unknown'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Health Matrix */}
      <Section icon={<HeartPulse className="h-4 w-4" />} title="Health Matrix" sub={`${w.health.length} tracked`}>
        {w.health.length === 0 ? <p className="text-[12px] text-fg-muted">No health records.</p> : (
          <table className="w-full min-w-[560px]">
            <thead><tr><th className={TH}>Provider</th><th className={TH}>Status</th><th className={TH}>Success</th><th className={TH}>Failure</th><th className={TH}>Last success</th><th className={TH}>Last failure</th></tr></thead>
            <tbody>
              {w.health.map(h => (
                <tr key={h.provider} className="border-t border-border-subtle">
                  <td className={TD}>{h.provider}</td>
                  <td className={TD}><span className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${dot(h.status)}`} />{h.status ?? '—'}</span></td>
                  <td className={TD}>{h.success_count ?? 0}</td>
                  <td className={TD}>{h.failure_count ?? 0}</td>
                  <td className={TD}>{relDate(h.last_success)}</td>
                  <td className={TD}>{relDate(h.last_failure)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Capability Matrix */}
      <Section icon={<Layers className="h-4 w-4" />} title="Capability Matrix" sub={`${w.capabilities.length} capabilities · ${agents.length} agents`}>
        {agents.length === 0 ? <p className="text-[12px] text-fg-muted">No capabilities registered.</p> : (
          <div className="space-y-3">
            {agents.map(([agent, caps]) => (
              <div key={agent}>
                <p className="text-[12px] font-medium text-fg-primary mb-1">{agent}</p>
                <div className="flex flex-wrap gap-1.5">
                  {caps.map((c, i) => (
                    <span key={`${agent}-${c.capability}-${i}`} className={`rounded px-1.5 py-0.5 text-[11px] ${c.is_active ? 'bg-accent-subtle text-accent' : 'bg-elevated text-fg-disabled'}`}>
                      {c.capability}{c.requires_approval ? ' 🔒' : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Cost Matrix (rate card + actuals) */}
      <Section icon={<DollarSign className="h-4 w-4" />} title="Cost Matrix" sub="rate card + logged spend">
        <p className="text-[11px] text-fg-disabled mb-2">Model rate card (per 1M tokens)</p>
        <table className="w-full min-w-[600px] mb-4">
          <thead><tr><th className={TH}>Provider</th><th className={TH}>Model</th><th className={TH}>Task</th><th className={TH}>In/M</th><th className={TH}>Out/M</th><th className={TH}>Free</th><th className={TH}>Enabled</th></tr></thead>
          <tbody>
            {w.models.map((m, i) => (
              <tr key={`${m.provider_name}-${m.model_id}-${i}`} className="border-t border-border-subtle">
                <td className={TD}>{m.provider_name}</td>
                <td className={`${TD} font-mono text-[11px]`}>{m.model_id}</td>
                <td className={TD}>{m.task_type ?? '—'}</td>
                <td className={TD}>{m.is_free ? '—' : fmtUsd(m.cost_in_per_m ?? 0)}</td>
                <td className={TD}>{m.is_free ? '—' : fmtUsd(m.cost_out_per_m ?? 0)}</td>
                <td className={TD}>{m.is_free ? 'Yes' : 'No'}</td>
                <td className={TD}>{m.enabled ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[11px] text-fg-disabled mb-2">Logged spend by model</p>
        {w.cost.length === 0 ? <p className="text-[12px] text-fg-muted">No inference logged yet.</p> : (
          <table className="w-full min-w-[600px]">
            <thead><tr><th className={TH}>Provider</th><th className={TH}>Model</th><th className={TH}>Calls</th><th className={TH}>Cost</th><th className={TH}>Tokens</th><th className={TH}>Success</th></tr></thead>
            <tbody>
              {w.cost.map((c, i) => (
                <tr key={`${c.provider}-${c.model}-${i}`} className="border-t border-border-subtle">
                  <td className={TD}>{c.provider}</td>
                  <td className={`${TD} font-mono text-[11px]`}>{c.model}</td>
                  <td className={TD}>{c.calls}</td>
                  <td className={TD}>{fmtUsd(c.cost_usd)}</td>
                  <td className={TD}>{(c.tokens_in + c.tokens_out).toLocaleString('en-IN')}</td>
                  <td className={TD}>{c.calls > 0 ? `${Math.round((c.successes / c.calls) * 100)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Onboarding Matrix */}
      <Section icon={<Rocket className="h-4 w-4" />} title="Onboarding Matrix" sub={`${w.onboarding.length} providers`}>
        {w.onboarding.length === 0 ? <p className="text-[12px] text-fg-muted">No onboarding manifests.</p> : (
          <table className="w-full min-w-[520px]">
            <thead><tr><th className={TH}>Provider</th><th className={TH}>Status</th><th className={TH}>Validated</th><th className={TH}>Approved</th></tr></thead>
            <tbody>
              {w.onboarding.map(o => (
                <tr key={o.provider_key} className="border-t border-border-subtle">
                  <td className={TD}>{o.display_name ?? o.provider_key}</td>
                  <td className={TD}><span className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${dot(o.status)}`} />{o.status}</span></td>
                  <td className={TD}>{relDate(o.validated_at)}</td>
                  <td className={TD}>{relDate(o.approved_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <p className="text-[11px] text-fg-disabled">Read-only. Activation, routing, and budget controls require founder approval (Phase F.2).</p>
    </div>
  )
}
