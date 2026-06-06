import type { Metadata } from 'next'
import { ShieldCheck, Bot, User, Clock, History as HistoryIcon, AlertTriangle, BrainCircuit, LayoutList } from 'lucide-react'
import { getPermissionInbox, type PermissionRequest } from '@/lib/permissions'
import { DecisionControls } from './decision-controls'
import { getAgentTaskInbox } from './agent-task-actions'
import { AgentTaskControls } from './agent-task-controls'
import type { PersistedTask } from '../ask/ask-chat'

export const metadata: Metadata = { title: 'Permissions' }
export const revalidate = 15

export default async function FounderPermissionsPage() {
  const { pending, active, history } = await getPermissionInbox(150)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-7">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-semibold text-fg-primary">Permissions</h1>
        </div>
        <p className="text-[13px] text-fg-muted">
          Approve or deny what your AI, agents, tools, and connected accounts are allowed to do.
        </p>
      </header>

      {/* ── Waiting for you ── */}
      <section className="space-y-3">
        <SectionHead
          title="Waiting for your decision"
          count={pending.length}
          emphasis={pending.length > 0}
        />
        {pending.length === 0 ? (
          <Empty>Nothing is waiting. When something asks for access, it shows up here.</Empty>
        ) : (
          pending.map((r) => <PendingCard key={r.id} r={r} />)
        )}
      </section>

      {/* ── Currently allowed ── */}
      <section className="space-y-3">
        <SectionHead title="Currently allowed" count={active.length} />
        {active.length === 0 ? (
          <Empty>No active permissions right now.</Empty>
        ) : (
          active.map((r) => <ActiveCard key={r.id} r={r} />)
        )}
      </section>

      {/* ── History (read-only) ── */}
      {history.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-fg-muted">
            <HistoryIcon className="h-3.5 w-3.5" /> Recent history
          </div>
          <div className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface">
            {history.slice(0, 15).map((r) => (
              <HistoryRow key={r.id} r={r} />
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center gap-1 text-[11px] text-fg-disabled">
        <Clock className="h-3 w-3" /> Updates every 15 seconds
      </div>
    </div>
  )
}

// ─── Cards ───────────────────────────────────────────────────────

function PendingCard({ r }: { r: PermissionRequest }) {
  return (
    <div className="rounded-xl border border-severity-warn/30 bg-severity-warn/[0.04] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <Requestor r={r} />
        <RiskBadge r={r} />
      </div>

      <div className="space-y-1.5 text-[13px]">
        <Field label="Wants to">{accessVerb(r.scope)} — <span className="text-fg-primary">{humanResource(r.resource_pattern)}</span></Field>
        {(r.reason || r.requested_task) && (
          <Field label="Why">{r.reason || r.requested_task}</Field>
        )}
        {r.impact && <Field label="Impact">{r.impact}</Field>}
        {r.alternatives && <Field label="Alternatives">{r.alternatives}</Field>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5 text-[11px] text-fg-muted">
          <span>Requestor: {r.requestor_name}</span>
          <span>System: {humanResource(r.resource_pattern)}</span>
          <span>Requested {timeAgo(r.requested_at)}</span>
          <span>Asked for: {durationLabel(r.grant_type)}</span>
          <span>Expiry: {timeUntil(r.expires_at)}</span>
          <span>Type: {r.scope}</span>
        </div>
      </div>

      <DecisionControls grantId={r.id} mode="pending" />
    </div>
  )
}

function ActiveCard({ r }: { r: PermissionRequest }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <Requestor r={r} />
        <span className="inline-flex items-center gap-1 rounded-full bg-severity-success/10 px-2 py-0.5 text-[10px] font-medium text-severity-success">
          allowed
        </span>
      </div>
      <div className="space-y-1.5 text-[13px]">
        <Field label="Can">{accessVerb(r.scope)} — <span className="text-fg-primary">{humanResource(r.resource_pattern)}</span></Field>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-muted">
          <span>{durationLabel(r.grant_type)}</span>
          <span>Ends {timeUntil(r.expires_at)}</span>
        </div>
      </div>
      <DecisionControls grantId={r.id} mode="active" />
    </div>
  )
}

function HistoryRow({ r }: { r: PermissionRequest }) {
  const outcome = r.revoked_at
    ? (r.granted_at ? 'Revoked' : 'Denied')
    : 'Expired'
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-[12px]">
      <div className="min-w-0">
        <p className="truncate text-fg-secondary">
          <span className="font-medium text-fg-primary">{r.requestor_name}</span>
          {' · '}{accessVerb(r.scope)}
        </p>
        <p className="truncate text-[11px] text-fg-disabled">{humanResource(r.resource_pattern)}</p>
      </div>
      <span className="shrink-0 text-[11px] text-fg-muted">{outcome}</span>
    </div>
  )
}

// ─── Pieces ──────────────────────────────────────────────────────

function Requestor({ r }: { r: PermissionRequest }) {
  const Icon = r.is_founder ? User : Bot
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-elevated">
        <Icon className="h-4 w-4 text-fg-muted" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-fg-primary">{r.requestor_name}</p>
        {r.requestor_vendor && (
          <p className="truncate text-[11px] text-fg-disabled">{r.requestor_vendor}</p>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-fg-secondary">
      <span className="text-fg-disabled">{label}: </span>
      {children}
    </p>
  )
}

function RiskBadge({ r }: { r: PermissionRequest }) {
  const level = riskOf(r)
  const map: Record<string, string> = {
    critical: 'border-severity-critical/40 bg-severity-critical/10 text-severity-critical',
    high: 'border-severity-critical/30 bg-severity-critical/5 text-severity-critical',
    medium: 'border-severity-warn/30 bg-severity-warn/10 text-severity-warn',
    low: 'border-border-subtle bg-canvas text-fg-muted',
  }
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${map[level] ?? map.low}`}>
      {(level === 'high' || level === 'critical') && <AlertTriangle className="h-3 w-3" />}
      {level} risk
    </span>
  )
}

function SectionHead({ title, count, emphasis }: { title: string; count: number; emphasis?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className={`text-[13px] font-semibold ${emphasis ? 'text-severity-warn' : 'text-fg-secondary'}`}>{title}</h2>
      <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium text-fg-muted">{count}</span>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border-subtle bg-surface px-4 py-5 text-center text-[13px] text-fg-muted">
      {children}
    </p>
  )
}

// ─── Plain-language helpers ──────────────────────────────────────

function accessVerb(scope: string): string {
  switch (scope) {
    case 'admin': return 'Take full control'
    case 'write': return 'Make changes'
    case 'read':  return 'View only'
    default:      return scope
  }
}

function riskOf(r: PermissionRequest): 'low' | 'medium' | 'high' | 'critical' {
  const explicit = (r.risk_level || '').toLowerCase()
  if (explicit === 'low' || explicit === 'medium' || explicit === 'high' || explicit === 'critical') return explicit
  if (r.scope === 'admin') return 'high'
  if (r.scope === 'write') return 'medium'
  return 'low'
}

function durationLabel(grantType: string | null): string {
  switch (grantType) {
    case 'single':    return 'One-time'
    case 'session':   return 'For a session'
    case 'permanent': return 'Permanent'
    default:          return 'Not specified'
  }
}

function humanResource(pattern: string): string {
  if (!pattern) return 'something'
  return pattern.replace(/\*/g, 'all').replace(/:/g, ' · ')
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'recently'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  const m = Math.round(ms / 60_000)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'now'
  const m = Math.round(ms / 60_000)
  if (m < 60) return `in ${m}m`
  const h = Math.round(m / 60)
  if (h < 48) return `in ${h}h`
  const d = Math.round(h / 24)
  if (d < 400) return `in ${d}d`
  return 'never (permanent)'
}
