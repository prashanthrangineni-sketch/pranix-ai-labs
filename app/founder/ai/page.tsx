import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, Check, X, CircleDot } from 'lucide-react'
import { getAiFramework, type ProviderOnboarding } from '@/lib/ai-framework'
import { ActivationButton } from './activation-button'

export const metadata: Metadata = { title: 'AI Models' }
export const dynamic = 'force-dynamic'

export default async function AiFrameworkPage() {
  const { providers, activeCount, draftCount, validatedReadyCount } = await getAiFramework()

  const active = providers.filter((p) => p.status === 'active')
  const ready = providers.filter((p) => p.status !== 'active' && p.validation_passes)
  const draft = providers.filter((p) => p.status !== 'active' && !p.validation_passes)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-7">
      <Link href="/founder/workspace" className="flex items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent-subtle px-3 py-2 text-[12px] text-accent hover:opacity-90 transition-opacity">
        <span>AI management is consolidating into the AI Workspace — providers, models, costs &amp; health in one place.</span>
        <span className="font-medium shrink-0">Open Workspace →</span>
      </Link>
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-semibold text-fg-primary">AI Integration Framework</h1>
        </div>
        <p className="text-[13px] text-fg-muted">
          Every AI provider, governed the same way. {activeCount} active · {validatedReadyCount} ready to activate · {draftCount} in setup.
          No provider can go live until every check passes.
        </p>
      </header>

      {active.length > 0 && (
        <Group title="Active">{active.map((p) => <ProviderCard key={p.provider_key} p={p} />)}</Group>
      )}
      {ready.length > 0 && (
        <Group title="Ready to activate">{ready.map((p) => <ProviderCard key={p.provider_key} p={p} />)}</Group>
      )}
      {draft.length > 0 && (
        <Group title="Needs setup">{draft.map((p) => <ProviderCard key={p.provider_key} p={p} />)}</Group>
      )}

      <p className="text-[11px] text-fg-disabled">
        Capabilities, cost and health are read live from the provider and model registries.
        Onboarding requirements come from the AI manifest. Activation routes to your Permission Center.
      </p>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[12px] font-semibold uppercase tracking-wide text-fg-disabled">{title}</h2>
      {children}
    </section>
  )
}

function ProviderCard({ p }: { p: ProviderOnboarding }) {
  const liveLabel =
    p.live_enabled === true ? 'Live: on'
    : p.live_enabled === false ? 'Live: off'
    : 'Not in provider registry'
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-[13px] font-bold text-fg-secondary">
            {p.display_name.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-fg-primary">{p.display_name}</p>
            <p className="truncate text-[11px] text-fg-disabled">
              {liveLabel}{p.health_status ? ` · ${p.health_status}` : ''}{p.tier != null ? ` · tier ${p.tier}` : ''}
            </p>
          </div>
        </div>
        <StatusBadge status={p.status} pass={p.validation_passes} />
      </div>

      {/* Validation checklist */}
      <div className="rounded-lg border border-border-subtle bg-canvas p-2.5 space-y-1">
        {p.checks.map((c) => (
          <div key={c.label} className="flex items-start gap-2 text-[12px]">
            {c.ok
              ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-severity-success" />
              : <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-severity-critical" />}
            <span className={c.ok ? 'text-fg-secondary' : 'text-fg-primary'}>
              {c.label} <span className="text-fg-disabled">— {c.detail}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Registry facts */}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
        <Fact label="Capabilities">{list(p.capabilities_provided)}</Fact>
        <Fact label="Models">{p.model_count > 0 ? `${p.model_count} (${p.free_model_count} free)` : 'none'}</Fact>
        <Fact label="Cost / 1M in">{p.cost_in_min != null ? `$${p.cost_in_min}–$${p.cost_in_max}` : (p.free_model_count > 0 ? 'free tier' : '—')}</Fact>
        <Fact label="Scopes">{p.scopes_required == null ? 'not declared' : list(p.scopes_required)}</Fact>
        <Fact label="Account access">{list(p.account_access_required, p.access_scopes.length ? `mapped: ${p.access_scopes.join(', ')}` : 'none required')}</Fact>
        <Fact label="MCP tools">{list(p.mcp_tools_supported)}</Fact>
        <Fact label="Webhooks">{list(p.webhooks_required)}</Fact>
        <Fact label="Callbacks">{list(p.callbacks_required)}</Fact>
        <Fact label="Governance">{list(p.mandatory_founder_approvals)}</Fact>
        <Fact label="Monitoring">{list(p.monitoring, '—')}</Fact>
      </dl>

      {p.status === 'active' ? (
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-severity-success/30 bg-severity-success/10 px-2.5 py-1.5 text-[12px] font-medium text-severity-success">
          <CircleDot className="h-3.5 w-3.5" /> Active
        </div>
      ) : (
        <ActivationButton
          providerKey={p.provider_key}
          displayName={p.display_name}
          canActivate={p.validation_passes}
        />
      )}
    </div>
  )
}

function StatusBadge({ status, pass }: { status: string; pass: boolean }) {
  let cls = 'border-border-subtle bg-canvas text-fg-muted'
  let label = status
  if (status === 'active') { cls = 'border-severity-success/30 bg-severity-success/10 text-severity-success'; label = 'active' }
  else if (pass) { cls = 'border-accent/30 bg-accent-subtle text-accent'; label = 'ready' }
  else { cls = 'border-severity-warn/30 bg-severity-warn/10 text-severity-warn'; label = 'setup needed' }
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-fg-disabled">{label}</dt>
      <dd className="truncate text-fg-secondary" title={typeof children === 'string' ? children : undefined}>{children}</dd>
    </div>
  )
}

function list(arr: string[], empty = 'not declared'): string {
  return arr && arr.length > 0 ? arr.join(', ') : empty
}
