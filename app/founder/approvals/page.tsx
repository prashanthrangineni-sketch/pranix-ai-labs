import type { Metadata } from 'next'
import { ShieldCheck, Bot, User, Clock, History as HistoryIcon, AlertTriangle, BrainCircuit, LayoutList,
         Inbox, FlameKindling, AlertCircle, Info, CheckCircle2, XCircle, ExternalLink, ListChecks,
         PlayCircle, CheckSquare, AlertOctagon, Ban } from 'lucide-react'
import { getPermissionInbox, type PermissionRequest } from '@/lib/permissions'
import { DecisionControls } from './decision-controls'
import { getAgentTaskInbox } from './agent-task-actions'
import { AgentTaskControls } from './agent-task-controls'
import { ViewReplayButton } from './view-replay-button'
import type { PersistedTask } from '../ask/ask-chat'
import type { Recommendation, RiskLevel } from '@/app/api/founder/recommendations/route'
import type { Operation, OpStatus } from '@/app/api/founder/operations/route'
import { RecDecisionControls } from './rec-decision-controls'

export const metadata: Metadata = { title: 'Permissions' }
export const revalidate = 0

async function fetchFromBase(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
  if (!base) return null
  const url = `${base.startsWith('http') ? base : `https://${base}`}${path}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

async function getRecommendations(): Promise<Recommendation[]> {
  try {
    const j = await fetchFromBase('/api/founder/recommendations')
    return j?.recommendations ?? []
  } catch { return [] }
}

async function getOperations(): Promise<{
  queued: Operation[]; ready: Operation[]; executing: Operation[];
  completed: Operation[]; blocked: Operation[]; history: Operation[];
}> {
  const empty = { queued: [], ready: [], executing: [], completed: [], blocked: [], history: [] }
  try {
    const j = await fetchFromBase('/api/founder/operations')
    return j ?? empty
  } catch { return empty }
}

export default async function FounderPermissionsPage() {
  const [{ pending, active, history }, agentInbox, recommendations, ops] = await Promise.all([
    getPermissionInbox(150),
    getAgentTaskInbox(),
    getRecommendations(),
    getOperations(),
  ])

  const pendingRecs   = recommendations.filter((r: Recommendation) => r.status === 'pending')
  const activeOps     = [...ops.queued, ...ops.ready, ...ops.executing]
  const totalPending  = pending.length + agentInbox.pending.length

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-7">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-semibold text-fg-primary">Approval Center</h1>
          {totalPending > 0 && (
            <span className="rounded-full bg-severity-warn/15 px-2 py-0.5 text-[11px] font-semibold text-severity-warn">
              {totalPending} pending
            </span>
          )}
          {pendingRecs.length > 0 && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
              {pendingRecs.length} rec{pendingRecs.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p className="text-[13px] text-fg-muted">
          Approve agent task plans, AI permission requests, and system recommendations.
        </p>
      </header>

      {/* ── P5: Founder Recommendations ── */}
      <section id="recommendations" className="space-y-3 scroll-mt-4">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-accent" />
          <h2 className={`text-[13px] font-semibold ${
            pendingRecs.length > 0 ? 'text-accent' : 'text-fg-secondary'
          }`}>Founder Recommendations</h2>
          <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium text-fg-muted">
            {pendingRecs.length} pending
          </span>
        </div>
        {recommendations.length === 0 ? (
          <Empty>No recommendations yet. The system scans for issues every time you open this page.</Empty>
        ) : (
          recommendations.map((rec: Recommendation) => (
            <RecCard key={rec.recommendation_id} rec={rec} />
          ))
        )}
      </section>

      <div className="border-t border-border-subtle" />

      {/* ── Agent Tasks waiting for approval ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-accent" />
          <h2 className={`text-[13px] font-semibold ${
            agentInbox.pending.length > 0 ? 'text-severity-warn' : 'text-fg-secondary'
          }`}>Agent task plans</h2>
          <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium text-fg-muted">
            {agentInbox.pending.length}
          </span>
        </div>

        {agentInbox.pending.length === 0 ? (
          <Empty>No agent tasks waiting. When an agent creates a plan it appears here first.</Empty>
        ) : (
          agentInbox.pending.map((task) => (
            <AgentTaskCard key={task.task_id} task={task} />
          ))
        )}
      </section>

      {/* ── Agent task history ── */}
      {agentInbox.history.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-fg-muted">
            <LayoutList className="h-3.5 w-3.5" /> Agent task history
          </div>
          <div className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface">
            {agentInbox.history.slice(0, 10).map((task) => (
              <AgentTaskHistoryRow key={task.task_id} task={task} />
            ))}
          </div>
        </section>
      )}

      <div className="border-t border-border-subtle pt-6 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-fg-muted" />
          <h2 className={`text-[13px] font-semibold ${
            pending.length > 0 ? 'text-severity-warn' : 'text-fg-secondary'
          }`}>Waiting for your decision</h2>
          <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium text-fg-muted">{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <Empty>Nothing is waiting. When something asks for access, it shows up here.</Empty>
        ) : (
          pending.map((r) => <PendingCard key={r.id} r={r} />)
        )}
      </div>

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

// ─── Agent Task sub-components ─────────────────────────────────────────

// ─── P5: RecCard ──────────────────────────────────────────────────────

const RISK_BORDER: Record<RiskLevel, string> = {
  critical: 'border-severity-critical/30 bg-severity-critical/[0.03]',
  high:     'border-severity-warn/30 bg-severity-warn/[0.03]',
  medium:   'border-yellow-400/25 bg-yellow-400/[0.02]',
  low:      'border-border-subtle bg-surface',
}

const RISK_BADGE: Record<RiskLevel, string> = {
  critical: 'bg-severity-critical/10 text-severity-critical',
  high:     'bg-severity-warn/10 text-severity-warn',
  medium:   'bg-yellow-400/10 text-yellow-600',
  low:      'bg-elevated text-fg-muted',
}

function RiskIcon({ level }: { level: RiskLevel }) {
  if (level === 'critical') return <FlameKindling className="h-3 w-3" />
  if (level === 'high')     return <AlertTriangle  className="h-3 w-3" />
  if (level === 'medium')   return <AlertCircle    className="h-3 w-3" />
  return                           <Info            className="h-3 w-3" />
}

function RecCard({ rec }: { rec: Recommendation }) {
  const isDone = rec.status !== 'pending'
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${
      isDone ? 'opacity-60 border-border-subtle bg-surface' : (RISK_BORDER[rec.risk_level] ?? RISK_BORDER.low)
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-elevated">
            <Inbox className="h-4 w-4 text-fg-muted" />
          </span>
          <div className="min-w-0">
            <p className={`text-[13px] font-semibold truncate ${
              isDone ? 'text-fg-disabled line-through' : 'text-fg-primary'
            }`}>{rec.title}</p>
            <p className="text-[11px] text-fg-disabled capitalize">{rec.category}</p>
          </div>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
          RISK_BADGE[rec.risk_level] ?? RISK_BADGE.low
        }`}>
          <RiskIcon level={rec.risk_level} />
          {rec.risk_level} risk
        </span>
      </div>

      <div className="space-y-1.5 text-[13px]">
        <p className="text-fg-secondary">{rec.summary}</p>
        <p className="text-fg-muted"><span className="text-fg-disabled">Action: </span>{rec.recommended_action}</p>
      </div>

      <div className="rounded-lg bg-elevated px-3 py-2 space-y-1">
        <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide">Evidence</p>
        <p className="text-[11px] text-fg-secondary"><span className="text-fg-disabled">Source: </span>{rec.evidence.source}</p>
        <p className="text-[11px] text-fg-secondary"><span className="text-fg-disabled">Detail: </span>{rec.evidence.detail}</p>
        {rec.evidence.confidence  && <p className="text-[11px] text-fg-secondary"><span className="text-fg-disabled">Confidence: </span>{rec.evidence.confidence}</p>}
        {rec.evidence.hash_status && <p className="text-[11px] text-fg-secondary"><span className="text-fg-disabled">Integrity: </span>{rec.evidence.hash_status}</p>}
        {rec.source_task_id && (
          <p className="mt-1">
            <a href={`/founder/replay?task_id=${rec.source_task_id}`} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline">
              View Replay <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-muted">
        <span>Confidence: {rec.confidence}%</span>
        <span>Generated: {new Date(rec.generated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        {isDone && <span className="font-medium text-fg-secondary capitalize">{rec.status}</span>}
      </div>

      {!isDone && <RecDecisionControls recommendationId={rec.recommendation_id} />}
    </div>
  )
}

// ─── Agent Task sub-components ─────────────────────────────────────────────────

function taskStatusBadge(status: string) {
  const map: Record<string, string> = {
    planned:   'bg-severity-warn/10 text-severity-warn',
    approved:  'bg-accent/10 text-accent',
    executing: 'bg-blue-500/10 text-blue-500',
    completed: 'bg-severity-success/10 text-severity-success',
    failed:    'bg-severity-critical/10 text-severity-critical',
  }
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
      map[status] ?? 'bg-elevated text-fg-muted'
    }`}>{status}</span>
  )
}

function AgentTaskCard({ task }: { task: PersistedTask }) {
  const planSteps = task.plan ?? []
  const lastEvent = task.timeline?.at(-1)
  const createdAt = task.created_at ? timeAgo(task.created_at) : 'recently'
  return (
    <div className="rounded-xl border border-severity-warn/30 bg-severity-warn/[0.03] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-elevated">
            <Bot className="h-4 w-4 text-fg-muted" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-fg-primary">{task.title || 'Agent task'}</p>
            <p className="text-[11px] text-fg-disabled">{task.workspace_id ? `Workspace ${task.workspace_id}` : 'No workspace'}</p>
          </div>
        </div>
        {taskStatusBadge(task.status)}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-muted">
        {task.model && <span>Model: {task.model}</span>}
        <span>Created {createdAt}</span>
        <span>{planSteps.length} step{planSteps.length !== 1 ? 's' : ''}</span>
        {task.timeline && <span>{task.timeline.length} events</span>}
      </div>
      {planSteps.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-fg-disabled uppercase tracking-wide">Plan</p>
          <ol className="space-y-1">
            {planSteps.slice(0, 5).map((step: { title?: string; description?: string }, i: number) => (
              <li key={i} className="flex gap-2 text-[12px] text-fg-secondary">
                <span className="shrink-0 text-fg-disabled">{i + 1}.</span>
                <span>{step.title ?? step.description ?? 'Step'}</span>
              </li>
            ))}
            {planSteps.length > 5 && <li className="text-[11px] text-fg-disabled pl-4">+{planSteps.length - 5} more steps</li>}
          </ol>
        </div>
      )}
      {lastEvent && (
        <p className="text-[11px] text-fg-muted"><span className="text-fg-disabled">Last event: </span>{lastEvent.label}</p>
      )}
      <AgentTaskControls taskId={task.task_id} />
    </div>
  )
}

function AgentTaskHistoryRow({ task }: { task: PersistedTask }) {
  const isDone = task.status === 'completed' || task.status === 'failed'
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5 text-[12px]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-fg-secondary">
          <span className="font-medium text-fg-primary">{task.title || task.goal || 'Agent task'}</span>
          {task.workspace_id && <span className="text-fg-disabled"> {task.workspace_id}</span>}
        </p>
        <p className="truncate text-[11px] text-fg-disabled">{(task.plan ?? []).length} steps {task.created_at ? timeAgo(task.created_at) : ''}</p>
        {isDone && (
          <div className="mt-1.5">
            <ViewReplayButton taskId={task.task_id} />
          </div>
        )}
      </div>
      {taskStatusBadge(task.status)}
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
