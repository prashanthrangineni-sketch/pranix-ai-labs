import { getOperations } from '@/lib/operations'
import { Lock, Activity, Rocket, Settings, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'More' }

function rel(iso: string | null) {
  if (!iso) return '—'
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function Section({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
        <span className="text-fg-muted">{icon}</span>
        <span className="text-[12px] font-semibold text-fg-primary uppercase tracking-wide">{title}</span>
        {sub && <span className="text-[11px] text-fg-disabled ml-auto">{sub}</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export default async function MorePage() {
  const o = await getOperations()
  const s = o.latestSnapshot

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-fg-primary tracking-tight">Operations</h1>
        <p className="text-[13px] text-fg-muted mt-1">Protocols, observability, deployments, and settings — read-only, from live control-plane data.</p>
      </div>

      {/* Observability */}
      <Section icon={<Activity className="h-4 w-4" />} title="Observability" sub={s ? `snapshot ${rel(s.snapshot_at)}` : 'no snapshots'}>
        {!s ? <p className="text-[12px] text-fg-muted">No system snapshots recorded.</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'System status', value: s.system_status ?? '—' },
              { label: 'Tasks pending', value: String(s.tasks_pending ?? 0) },
              { label: 'Tasks running', value: String(s.tasks_running ?? 0) },
              { label: 'Dead (1h)', value: String(s.tasks_dead_1h ?? 0) },
              { label: 'Queue pressure', value: String(s.queue_pressure ?? 0) },
              { label: 'Inference (1h)', value: String(s.inference_calls_1h ?? 0) },
              { label: 'Inference fails (1h)', value: String(s.inference_fails_1h ?? 0) },
              { label: 'Critical alerts (1h)', value: String(s.critical_alerts_1h ?? 0) },
            ].map((m) => (
              <div key={m.label} className="rounded-lg border border-border-subtle bg-canvas p-3">
                <p className="text-[10px] uppercase tracking-wide text-fg-disabled">{m.label}</p>
                <p className="text-[15px] font-semibold text-fg-primary mt-0.5 tabular-nums">{m.value}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Deployments */}
      <Section icon={<Rocket className="h-4 w-4" />} title="Deployments" sub={`${o.deployments.length} recent diagnostics`}>
        <div className="space-y-3">
          {o.apks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {o.apks.map((a, i) => (
                <div key={`${a.package_name}-${i}`} className="rounded-md border border-border-subtle bg-canvas px-3 py-1.5 text-[12px] flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 text-fg-muted" />
                  <span className="text-fg-primary font-medium">{a.product_name ?? a.package_name}</span>
                  <span className="text-fg-muted">v{a.version_name ?? '—'}</span>
                  {a.readiness_score != null && <span className="text-fg-disabled">· {a.readiness_score}% ready</span>}
                  {a.play_store_status && <span className="text-fg-disabled">· {a.play_store_status}</span>}
                </div>
              ))}
            </div>
          )}
          {o.deployments.length === 0 ? (
            <p className="text-[12px] text-fg-muted">No deployment diagnostics.</p>
          ) : (
            <div className="divide-y divide-border-subtle">
              {o.deployments.map((d, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  {d.resolved ? <CheckCircle2 className="h-4 w-4 text-severity-success shrink-0" /> : <AlertCircle className="h-4 w-4 text-severity-warn shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-fg-primary truncate">{d.project_name ?? '—'} <span className="text-fg-disabled">· {d.branch ?? '—'}</span></p>
                    <p className="text-[11px] text-fg-muted truncate">{d.error_type ? `${d.error_type}: ` : ''}{d.error_summary ?? 'No error'}</p>
                  </div>
                  <span className="text-[10px] text-fg-disabled shrink-0">{rel(d.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Protocols */}
      <Section icon={<Lock className="h-4 w-4" />} title="Protocols" sub={`${o.protocols.length} registered`}>
        {o.protocols.length === 0 ? <p className="text-[12px] text-fg-muted">No protocols registered.</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {o.protocols.map((p) => (
              <div key={p.name} className="rounded-lg border border-border-subtle bg-canvas px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-fg-primary truncate flex-1">{p.name}</span>
                  {p.version && <span className="text-[10px] text-fg-disabled">v{p.version}</span>}
                  {p.status && <span className={`text-[9px] px-1.5 py-0.5 rounded ${p.status === 'active' ? 'bg-accent-subtle text-accent' : 'bg-elevated text-fg-disabled'}`}>{p.status}</span>}
                </div>
                {p.description && <p className="text-[11px] text-fg-muted mt-0.5 line-clamp-2">{p.description}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Settings */}
      <Section icon={<Settings className="h-4 w-4" />} title="Settings" sub="read-only">
        <div className="space-y-3 text-[12px]">
          <div>
            <p className="text-[11px] font-semibold text-fg-muted mb-1.5">Founder access ({o.founders.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {o.founders.map((e) => <span key={e} className="rounded bg-elevated px-2 py-0.5 text-[11px] text-fg-secondary font-mono">{e}</span>)}
            </div>
            <p className="text-[11px] text-fg-muted mt-1.5">Recovery secret: <span className={o.breakGlassConfigured ? 'text-severity-success' : 'text-fg-disabled'}>{o.breakGlassConfigured ? 'configured' : 'not configured'}</span></p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-fg-muted mb-1.5">System modes</p>
            <div className="space-y-1">
              {o.modes.map((m) => (
                <div key={m.mode_name} className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${m.active ? 'bg-severity-success' : 'bg-fg-disabled'}`} />
                  <span className="text-fg-secondary">{m.mode_name}</span>
                  {m.active && <span className="text-[10px] text-severity-success">active</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between border-t border-border-subtle pt-2">
            <span className="text-fg-muted">Timezone</span><span className="text-fg-secondary">Asia/Kolkata</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fg-muted">Daily digest</span><span className="text-fg-secondary">05:00 IST</span>
          </div>
        </div>
      </Section>

      <p className="text-[11px] text-fg-disabled">Read-only operational views. Changes to providers, budgets, and routing are introduced in the AI Workspace operational layer (approval-gated).</p>
    </div>
  )
}
