import type { Metadata } from 'next'
import { ShieldCheck, Shield, Bot, User, Clock, History as HistoryIcon, AlertTriangle, BrainCircuit, LayoutList,
         Inbox, FlameKindling, AlertCircle, Info, CheckCircle2, XCircle, ExternalLink, ListChecks,
         PlayCircle, CheckSquare, AlertOctagon, Ban, Sparkles, TrendingUp, TrendingDown, Send, Activity, Clock } from 'lucide-react'
import { getPermissionInbox, type PermissionRequest } from '@/lib/permissions'
import { DecisionControls } from './decision-controls'
import { getAgentTaskInbox } from './agent-task-actions'
import { AgentTaskControls } from './agent-task-controls'
import { ViewReplayButton } from './view-replay-button'
import type { PersistedTask } from '../ask/ask-chat'
import type { Recommendation, RiskLevel } from '@/app/api/founder/recommendations/route'
import type { Operation, OpStatus }       from '@/app/api/founder/operations/route'
import type { ScheduleEntry }              from '@/app/api/founder/scheduler/route'
import type { GovernanceEvaluation, Policy } from '@/app/api/founder/governance/route'
import type { DispatchRecord }                from '@/app/api/founder/dispatch/route'
import type { ActivationRecord }              from '@/app/api/founder/activation/route'
import type { QueueRecord }                   from '@/app/api/founder/queue/route'
import type { AuthorityRecord }               from '@/app/api/founder/authority/route'
import type { ExecutionRecord }               from '@/app/api/founder/execution/route'
import type { LearningRecord, LearningEngine } from '@/app/api/founder/learning/route'
import type { AutonomyEngine, AutonomyStatus } from '@/app/api/founder/autonomy/route'
import { RecDecisionControls }            from './rec-decision-controls'

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

async function getSchedule(): Promise<ScheduleEntry[]> {
  try {
    const j = await fetchFromBase('/api/founder/scheduler')
    return [
      ...(j?.ready_now  ?? []),
      ...(j?.blocked    ?? []),
    ] as ScheduleEntry[]
  } catch { return [] }
}

async function getGovernance(): Promise<{ evaluations: GovernanceEvaluation[]; policies: Policy[] }> {
  try {
    const j = await fetchFromBase('/api/founder/governance')
    return {
      evaluations: (j?.evaluations ?? []) as GovernanceEvaluation[],
      policies:    (j?.policies    ?? []) as Policy[],
    }
  } catch { return { evaluations: [], policies: [] } }
}

async function getAuthority(): Promise<{
  pending: AuthorityRecord[]; authorized: AuthorityRecord[];
  blocked: AuthorityRecord[]; expired: AuthorityRecord[]; revoked: AuthorityRecord[]
}> {
  const empty = { pending: [], authorized: [], blocked: [], expired: [], revoked: [] }
  try {
    const j = await fetchFromBase('/api/founder/authority')
    return j ? {
      pending:    (j.pending    ?? []) as AuthorityRecord[],
      authorized: (j.authorized ?? []) as AuthorityRecord[],
      blocked:    (j.blocked    ?? []) as AuthorityRecord[],
      expired:    (j.expired    ?? []) as AuthorityRecord[],
      revoked:    (j.revoked    ?? []) as AuthorityRecord[],
    } : empty
  } catch { return empty }
}

async function getLearning(): Promise<{
  records: LearningRecord[]
  success_patterns: string[]
  failure_patterns: string[]
  top_insights: string[]
  recommendation_quality: number
  learning_count: number
}> {
  const empty = { records: [], success_patterns: [], failure_patterns: [], top_insights: [], recommendation_quality: 0, learning_count: 0 }
  try {
    const j = await fetchFromBase('/api/founder/learning')
    return j ? {
      records:                (j.records                ?? []) as LearningRecord[],
      success_patterns:       (j.success_patterns       ?? []) as string[],
      failure_patterns:       (j.failure_patterns       ?? []) as string[],
      top_insights:           (j.top_insights           ?? []) as string[],
      recommendation_quality:  j.recommendation_quality ?? 0,
      learning_count:          j.learning_count         ?? 0,
    } : empty
  } catch { return empty }
}

async function getAutonomy(): Promise<AutonomyEngine | null> {
  try {
    const j = await fetchFromBase('/api/founder/autonomy')
    return j as AutonomyEngine | null
  } catch { return null }
}

async function getQueue(): Promise<{
  records: QueueRecord[]
  queued: number
  leased: number
  executing: number
  completed: number
  failed: number
  dead_letter: number
  top_item: QueueRecord | null
}> {
  const empty = { records: [], queued: 0, leased: 0, executing: 0, completed: 0, failed: 0, dead_letter: 0, top_item: null }
  try {
    const j = await fetchFromBase('/api/founder/queue')
    return j ? {
      records:     (j.records ?? []) as QueueRecord[],
      queued:       j.queued      ?? 0,
      leased:       j.leased      ?? 0,
      executing:    j.executing   ?? 0,
      completed:    j.completed   ?? 0,
      failed:       j.failed      ?? 0,
      dead_letter:  j.dead_letter ?? 0,
      top_item:     j.top_item    ?? null,
    } : empty
  } catch { return empty }
}

async function getActivation(): Promise<{
  records: ActivationRecord[]
  pending: number
  activated: number
  executing: number
  completed: number
  failed: number
  blocked: number
  top_active: ActivationRecord | null
}> {
  const empty = { records: [], pending: 0, activated: 0, executing: 0, completed: 0, failed: 0, blocked: 0, top_active: null }
  try {
    const j = await fetchFromBase('/api/founder/activation')
    return j ? {
      records:    (j.records    ?? []) as ActivationRecord[],
      pending:     j.pending    ?? 0,
      activated:   j.activated  ?? 0,
      executing:   j.executing  ?? 0,
      completed:   j.completed  ?? 0,
      failed:      j.failed     ?? 0,
      blocked:     j.blocked    ?? 0,
      top_active:  j.top_active ?? null,
    } : empty
  } catch { return empty }
}

async function getDispatch(): Promise<{
  records: DispatchRecord[]
  queued: number
  dispatched: number
  blocked: number
  eligible: number
  top_candidate: DispatchRecord | null
}> {
  const empty = { records: [], queued: 0, dispatched: 0, blocked: 0, eligible: 0, top_candidate: null }
  try {
    const j = await fetchFromBase('/api/founder/dispatch')
    return j ? {
      records:       (j.records       ?? []) as DispatchRecord[],
      queued:         j.queued        ?? 0,
      dispatched:     j.dispatched    ?? 0,
      blocked:        j.blocked       ?? 0,
      eligible:       j.eligible      ?? 0,
      top_candidate:  j.top_candidate ?? null,
    } : empty
  } catch { return empty }
}

async function getExecution(): Promise<{
  queued: ExecutionRecord[]; eligible: ExecutionRecord[]; executing: ExecutionRecord[];
  completed: ExecutionRecord[]; failed: ExecutionRecord[]; blocked: ExecutionRecord[]
}> {
  const empty = { queued: [], eligible: [], executing: [], completed: [], failed: [], blocked: [] }
  try {
    const j = await fetchFromBase('/api/founder/execution')
    return j ? {
      queued:    (j.queued    ?? []) as ExecutionRecord[],
      eligible:  (j.eligible  ?? []) as ExecutionRecord[],
      executing: (j.executing ?? []) as ExecutionRecord[],
      completed: (j.completed ?? []) as ExecutionRecord[],
      failed:    (j.failed    ?? []) as ExecutionRecord[],
      blocked:   (j.blocked   ?? []) as ExecutionRecord[],
    } : empty
  } catch { return empty }
}

export default async function FounderPermissionsPage() {
  const [
    { pending, active, history },
    agentInbox,
    recommendations,
    ops,
    scheduleEntries,
    governanceData,
    authorityData,
    executionData,
    learningData,
    autonomyData,
    dispatchData,
    activationData,
    queueData,
  ] = await Promise.all([
    getPermissionInbox(150),
    getAgentTaskInbox(),
    getRecommendations(),
    getOperations(),
    getSchedule(),
    getGovernance(),
    getAuthority(),
    getExecution(),
    getLearning(),
    getAutonomy(),
    getDispatch(),
    getActivation(),
    getQueue(),
  ])

  // Build a lookup: operation_id → ScheduleEntry
  const scheduleMap = new Map<string, ScheduleEntry>(
    scheduleEntries.map(e => [e.operation_id, e])
  )

  // Build a lookup: operation_id → GovernanceEvaluation
  const govMap = new Map<string, GovernanceEvaluation>(
    governanceData.evaluations.map(e => [e.operation_id, e])
  )

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
          {activeOps.length > 0 && (
            <span className="rounded-full bg-severity-success/15 px-2 py-0.5 text-[11px] font-semibold text-severity-success">
              {activeOps.length} op{activeOps.length !== 1 ? 's' : ''}
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

      {/* ── P6: Operations Queue ── */}
      <section id="operations" className="space-y-3 scroll-mt-4 border-t border-border-subtle pt-6">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-severity-success" />
          <h2 className={`text-[13px] font-semibold ${
            activeOps.length > 0 ? 'text-severity-success' : 'text-fg-secondary'
          }`}>Operations Queue</h2>
          <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium text-fg-muted">
            {activeOps.length} active
          </span>
        </div>
        {activeOps.length === 0 ? (
          <Empty>No operations queued. Approve a recommendation above to create one.</Empty>
        ) : (
          activeOps.map((op: Operation) => (
            <OpCard
              key={op.operation_id}
              op={op}
              schedule={scheduleMap.get(op.operation_id)}
              governance={govMap.get(op.operation_id)}
            />
          ))
        )}
      </section>

      {/* ── P7: Execution Readiness panel ── */}
      {scheduleEntries.length > 0 && (
        <section id="execution-readiness" className="space-y-3 scroll-mt-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-accent" />
            <h2 className="text-[13px] font-semibold text-fg-secondary">Execution Readiness</h2>
            <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium text-fg-muted">
              {scheduleEntries.filter(e => e.can_run_now).length} ready · {scheduleEntries.filter(e => !e.can_run_now).length} blocked
            </span>
          </div>

          <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface overflow-hidden">
            {scheduleEntries
              .sort((a, b) => b.priority_score - a.priority_score)
              .map((entry, idx) => {
                const readyCls = entry.can_run_now
                  ? 'text-severity-success'
                  : 'text-fg-disabled'
                const tierCls  = entry.tier === 'critical' ? 'text-severity-critical'
                  : entry.tier === 'high' ? 'text-severity-warn'
                  : entry.tier === 'medium' ? 'text-accent'
                  : 'text-fg-disabled'
                return (
                  <div key={entry.operation_id} className="flex items-start gap-3 px-3 py-3">
                    <span className="shrink-0 w-5 text-center text-[11px] font-semibold text-fg-disabled tabular-nums mt-0.5">
                      #{idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-fg-primary truncate">{entry.title}</p>
                      <p className="text-[11px] text-fg-muted mt-0.5">{entry.reason}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px]">
                        <span className={tierCls}>{entry.tier.toUpperCase()}</span>
                        <span className="text-fg-disabled">Priority {entry.priority_score}/100</span>
                        <span className="text-fg-disabled">Value {entry.founder_value_score}/100</span>
                        <span className="text-fg-disabled">Risk {entry.risk_score}/100</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className={`text-[11px] font-semibold ${readyCls}`}>
                        {entry.can_run_now ? 'Ready' : 'Blocked'}
                      </span>
                      {!entry.can_run_now && entry.blocked_by.length > 0 &&
                        entry.blocked_by[0] !== 'cancelled' && (
                        <span className="text-[10px] text-fg-disabled">dep: {entry.blocked_by.length}</span>
                      )}
                    </div>
                  </div>
                )
              })
            }
          </div>
        </section>
      )}

      {/* ── P8: Governance Review ── */}
      {governanceData.evaluations.length > 0 && (
        <section id="governance" className="space-y-3 scroll-mt-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            <h2 className="text-[13px] font-semibold text-fg-secondary">Governance Review</h2>
            <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium text-fg-muted">
              {governanceData.evaluations.filter(e => e.verdict === 'allowed').length} allowed
              &nbsp;&middot;&nbsp;
              {governanceData.evaluations.filter(e => e.verdict === 'needs_approval').length} pending approval
              &nbsp;&middot;&nbsp;
              {governanceData.evaluations.filter(e => e.verdict === 'blocked').length} blocked
            </span>
          </div>

          {/* Policy list */}
          {governanceData.policies.length > 0 && (
            <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden">
              <div className="px-3 py-2 border-b border-border-subtle flex items-center justify-between">
                <span className="text-[11px] font-semibold text-fg-secondary uppercase tracking-wide">Active Policies</span>
                <span className="text-[10px] text-fg-disabled">{governanceData.policies.filter(p => p.enabled).length} of {governanceData.policies.length} enabled</span>
              </div>
              <div className="divide-y divide-border-subtle">
                {governanceData.policies.map(pol => (
                  <div key={pol.policy_id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${
                      pol.enabled ? 'bg-severity-success' : 'bg-fg-disabled'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-fg-primary">{pol.name}</p>
                      <p className="text-[11px] text-fg-muted">{pol.description}</p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-0.5">
                      {pol.approval_required ? (
                        <span className="text-[10px] font-semibold text-severity-warn">Approval required</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-severity-success">Auto-permitted</span>
                      )}
                      <span className="text-[10px] text-fg-disabled capitalize">Max risk: {pol.max_risk}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evaluation rows */}
          <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface overflow-hidden">
            {governanceData.evaluations
              .sort((a, b) => {
                const order = { blocked: 0, needs_approval: 1, allowed: 2 }
                return (order[a.verdict] ?? 3) - (order[b.verdict] ?? 3)
              })
              .map(ev => {
                const verdictCls = ev.verdict === 'blocked'
                  ? { badge: 'bg-severity-critical/10 text-severity-critical', icon: 'text-severity-critical' }
                  : ev.verdict === 'needs_approval'
                  ? { badge: 'bg-severity-warn/10 text-severity-warn', icon: 'text-severity-warn' }
                  : { badge: 'bg-severity-success/10 text-severity-success', icon: 'text-severity-success' }
                const verdictLabel = ev.verdict === 'blocked' ? 'Blocked'
                  : ev.verdict === 'needs_approval' ? 'Needs Approval'
                  : 'Allowed'
                return (
                  <div key={ev.operation_id} className="flex items-start gap-3 px-3 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-fg-primary truncate">{ev.operation_title}</p>
                      <p className="text-[11px] text-fg-muted mt-0.5">
                        Policy: <span className="text-fg-secondary">{ev.policy_name}</span>
                      </p>
                      <p className="text-[11px] text-fg-secondary mt-0.5">{ev.reason}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${verdictCls.badge}`}>
                      {verdictLabel}
                    </span>
                  </div>
                )
              })
            }
          </div>
        </section>
      )}

      {/* ── S3: Dispatch Review ── */}
      {dispatchData.records.length > 0 && (() => {
        const STATUS_ORDER: Record<string, number> = {
          blocked: 0, queued: 1, dispatched: 2, executing: 3, completed: 4, failed: 5
        }
        const sorted = [...dispatchData.records].sort((a, b) =>
          (STATUS_ORDER[a.dispatch_status] ?? 9) - (STATUS_ORDER[b.dispatch_status] ?? 9)
        )
        return (
          <section id="dispatch" className="space-y-3 scroll-mt-4 border-t border-border-subtle pt-6">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-accent" />
              <h2 className="text-[13px] font-semibold text-fg-secondary">Dispatch Review</h2>
              <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium text-fg-muted">
                {dispatchData.eligible} eligible
                &nbsp;&middot;&nbsp;
                {dispatchData.queued} queued
                &nbsp;&middot;&nbsp;
                {dispatchData.blocked} blocked
              </span>
            </div>

            <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface overflow-hidden">
              {sorted.map(rec => {
                const statusMeta: Record<string, { badge: string; label: string }> = {
                  dispatched: { badge: 'bg-severity-success/10 text-severity-success', label: 'Dispatched' },
                  queued:     { badge: 'bg-accent/10 text-accent',                    label: 'Queued' },
                  executing:  { badge: 'bg-severity-warn/10 text-severity-warn',      label: 'Executing' },
                  completed:  { badge: 'bg-severity-success/10 text-severity-success', label: 'Completed' },
                  failed:     { badge: 'bg-severity-critical/10 text-severity-critical', label: 'Failed' },
                  blocked:    { badge: 'bg-severity-critical/10 text-severity-critical', label: 'Blocked' },
                }
                const meta = statusMeta[rec.dispatch_status] ?? statusMeta.blocked

                return (
                  <div key={rec.dispatch_id} className="px-3 py-3 space-y-1.5">
                    {/* Row 1: title + status badge */}
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13px] font-medium text-fg-primary truncate flex-1">
                        {rec.operation_title}
                      </p>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </div>

                    {/* Row 2: dispatch reason */}
                    <p className="text-[12px] text-fg-secondary leading-relaxed">{rec.dispatch_reason}</p>

                    {/* Row 3: mode + authority + governance */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-fg-muted">
                      <span>Mode: <span className="text-fg-secondary font-medium">{rec.founder_mode}</span></span>
                      <span>Authority: <span className={`font-medium ${
                        rec.authority_status === 'authorized' ? 'text-severity-success'
                        : rec.authority_status === 'blocked'  ? 'text-severity-critical'
                        : 'text-severity-warn'
                      }`}>{rec.authority_status}</span></span>
                      <span>Governance: <span className={`font-medium ${
                        rec.governance_status === 'allowed'       ? 'text-severity-success'
                        : rec.governance_status === 'needs_approval' ? 'text-severity-warn'
                        : 'text-severity-critical'
                      }`}>{rec.governance_status}</span></span>
                      <span className="text-fg-disabled tabular-nums">
                        Priority {rec.priority_score} · Risk {rec.risk_score}
                      </span>
                    </div>

                    {/* Row 4: timestamps */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-fg-disabled tabular-nums">
                      <span>Created: {new Date(rec.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      {rec.dispatched_at && (
                        <span>Dispatched: {new Date(rec.dispatched_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })()}

      {/* ── S5: Queue Review ── */}
      {queueData.records.length > 0 && (() => {
        const STATUS_ORDER: Record<string, number> = {
          dead_letter: 0, failed: 1, queued: 2, leased: 3, executing: 4, completed: 5
        }
        const sorted = [...queueData.records].sort((a, b) =>
          (STATUS_ORDER[a.queue_status] ?? 9) - (STATUS_ORDER[b.queue_status] ?? 9)
        )
        const statusMeta: Record<string, { badge: string; label: string }> = {
          queued:      { badge: 'bg-accent/10 text-accent',                       label: 'Queued' },
          leased:      { badge: 'bg-severity-warn/10 text-severity-warn',         label: 'Leased' },
          executing:   { badge: 'bg-severity-warn/10 text-severity-warn',         label: 'Executing' },
          completed:   { badge: 'bg-severity-success/10 text-severity-success',   label: 'Completed' },
          failed:      { badge: 'bg-severity-critical/10 text-severity-critical', label: 'Failed' },
          dead_letter: { badge: 'bg-severity-critical/10 text-severity-critical', label: 'Dead Letter' },
        }
        return (
          <section id="queue" className="space-y-3 scroll-mt-4 border-t border-border-subtle pt-6">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-accent" />
              <h2 className="text-[13px] font-semibold text-fg-secondary">Queue Review</h2>
              <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium text-fg-muted">
                {queueData.queued} queued
                &nbsp;&middot;&nbsp;
                {queueData.dead_letter} dead letter
              </span>
            </div>

            <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface overflow-hidden">
              {sorted.map(rec => {
                const meta = statusMeta[rec.queue_status] ?? statusMeta.dead_letter
                const isLeased = rec.queue_status === 'leased'
                const leaseExpired = isLeased && rec.lease_expires_at && Date.now() > new Date(rec.lease_expires_at).getTime()
                return (
                  <div key={rec.queue_id} className="px-3 py-3 space-y-1.5">

                    {/* Row 1: title + status badge */}
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13px] font-medium text-fg-primary truncate flex-1">{rec.operation_title}</p>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </div>

                    {/* Row 2: retry count + lease state */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-fg-muted">
                      <span>Mode: <span className="font-medium text-fg-secondary">{rec.founder_mode}</span></span>
                      <span className="tabular-nums">
                        Retry: <span className={`font-medium ${
                          rec.retry_count >= rec.max_retries ? 'text-severity-critical'
                          : rec.retry_count > 0 ? 'text-severity-warn'
                          : 'text-fg-secondary'
                        }`}>{rec.retry_count}/{rec.max_retries}</span>
                      </span>
                      {isLeased && (
                        <span className={leaseExpired ? 'text-severity-critical font-medium' : 'text-severity-warn'}>
                          {leaseExpired ? 'Lease expired' : `Leased by: ${rec.leased_by ?? 'system'}`}
                        </span>
                      )}
                      {rec.failure_reason && (
                        <span className="text-severity-critical truncate max-w-[40ch]" title={rec.failure_reason}>
                          {rec.failure_reason}
                        </span>
                      )}
                    </div>

                    {/* Row 3: timestamps */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-fg-disabled tabular-nums">
                      <span>Queued: {new Date(rec.queued_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      {rec.started_at && (
                        <span>Started: {new Date(rec.started_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      )}
                      {rec.completed_at && (
                        <span>Completed: {new Date(rec.completed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })()}

      {/* ── S4: Activation Review ── */}
      {activationData.records.length > 0 && (() => {
        const STATUS_ORDER: Record<string, number> = {
          blocked: 0, pending: 1, activated: 2, executing: 3, completed: 4, failed: 5
        }
        const sorted = [...activationData.records].sort((a, b) =>
          (STATUS_ORDER[a.activation_status] ?? 9) - (STATUS_ORDER[b.activation_status] ?? 9)
        )
        const statusMeta: Record<string, { badge: string; label: string }> = {
          pending:   { badge: 'bg-severity-warn/10 text-severity-warn',         label: 'Pending' },
          activated: { badge: 'bg-severity-success/10 text-severity-success',   label: 'Activated' },
          executing: { badge: 'bg-accent/10 text-accent',                       label: 'Executing' },
          completed: { badge: 'bg-severity-success/10 text-severity-success',   label: 'Completed' },
          failed:    { badge: 'bg-severity-critical/10 text-severity-critical', label: 'Failed' },
          blocked:   { badge: 'bg-severity-critical/10 text-severity-critical', label: 'Blocked' },
        }
        return (
          <section id="activation" className="space-y-3 scroll-mt-4 border-t border-border-subtle pt-6">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-severity-success" />
              <h2 className="text-[13px] font-semibold text-fg-secondary">Activation Review</h2>
              <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium text-fg-muted">
                {activationData.activated} activated
                &nbsp;&middot;&nbsp;
                {activationData.pending} pending
                &nbsp;&middot;&nbsp;
                {activationData.blocked} blocked
              </span>
            </div>

            <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface overflow-hidden">
              {sorted.map(rec => {
                const meta = statusMeta[rec.activation_status] ?? statusMeta.blocked
                return (
                  <div key={rec.activation_id} className="px-3 py-3 space-y-1.5">

                    {/* Row 1: title + status badge */}
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13px] font-medium text-fg-primary truncate flex-1">{rec.operation_title}</p>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </div>

                    {/* Row 2: activation reason */}
                    <p className="text-[12px] text-fg-secondary leading-relaxed">{rec.activation_reason}</p>

                    {/* Row 3: mode + dispatch + governance */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-fg-muted">
                      <span>Mode: <span className="text-fg-secondary font-medium">{rec.founder_mode}</span></span>
                      <span>Dispatch: <span className={`font-medium ${
                        rec.dispatch_status === 'dispatched' ? 'text-severity-success'
                        : rec.dispatch_status === 'blocked'  ? 'text-severity-critical'
                        : 'text-severity-warn'
                      }`}>{rec.dispatch_status}</span></span>
                      <span>Authority: <span className={`font-medium ${
                        rec.authority_status === 'authorized' ? 'text-severity-success'
                        : rec.authority_status === 'blocked'  ? 'text-severity-critical'
                        : 'text-severity-warn'
                      }`}>{rec.authority_status}</span></span>
                      <span>Governance: <span className={`font-medium ${
                        rec.governance_status === 'allowed'       ? 'text-severity-success'
                        : rec.governance_status === 'needs_approval' ? 'text-severity-warn'
                        : 'text-severity-critical'
                      }`}>{rec.governance_status}</span></span>
                      <span className="text-fg-disabled tabular-nums">
                        Priority {rec.priority_score} · Risk {rec.risk_score}
                      </span>
                    </div>

                    {/* Row 4: timestamps */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-fg-disabled tabular-nums">
                      <span>Started: {rec.activated_at
                        ? new Date(rec.activated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                        : '—'}
                      </span>
                      <span>Completed: {rec.completed_at
                        ? new Date(rec.completed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                        : '—'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })()}

      {/* ── P10: Authority Review ── */}
      {(() => {
        const allRecords: AuthorityRecord[] = [
          ...authorityData.blocked,
          ...authorityData.pending,
          ...authorityData.authorized,
          ...authorityData.expired,
          ...authorityData.revoked,
        ]
        if (allRecords.length === 0) return null

        return (
          <section id="authority" className="space-y-3 scroll-mt-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent" />
              <h2 className="text-[13px] font-semibold text-fg-secondary">Authority Review</h2>
              <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium text-fg-muted">
                {authorityData.authorized.length} authorized
                &nbsp;&middot;&nbsp;
                {authorityData.pending.length} pending
                &nbsp;&middot;&nbsp;
                {authorityData.blocked.length} blocked
              </span>
            </div>

            <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface overflow-hidden">
              {allRecords.map(rec => {
                const statusMeta: Record<string, { badge: string; label: string }> = {
                  authorized: { badge: 'bg-severity-success/10 text-severity-success', label: 'Authorized' },
                  pending:    { badge: 'bg-severity-warn/10 text-severity-warn',       label: 'Pending Approval' },
                  blocked:    { badge: 'bg-severity-critical/10 text-severity-critical', label: 'Blocked' },
                  expired:    { badge: 'bg-elevated text-fg-disabled',                 label: 'Expired' },
                  revoked:    { badge: 'bg-elevated text-fg-disabled',                 label: 'Revoked' },
                }
                const meta = statusMeta[rec.authorization_status] ?? statusMeta.expired

                return (
                  <div key={rec.authority_id} className="px-3 py-3 space-y-1.5">
                    {/* Row 1: title + badge */}
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13px] font-medium text-fg-primary truncate flex-1">{rec.operation_title}</p>
                      <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </div>

                    {/* Row 2: mode + governance + authorized_by */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-fg-muted">
                      <span>Mode: <span className="text-fg-secondary font-medium">{rec.mode_id}</span></span>
                      <span>Policy: <span className="text-fg-secondary">{rec.governance_policy}</span></span>
                      {rec.authorized_by && (
                        <span>By: <span className="text-fg-secondary capitalize">{rec.authorized_by}</span></span>
                      )}
                    </div>

                    {/* Row 3: reason */}
                    <p className="text-[11px] text-fg-secondary">{rec.reason}</p>

                    {/* Row 4: expiry time */}
                    {rec.expires_at && rec.authorization_status === 'authorized' && (
                      <p className="text-[11px] text-fg-muted">
                        Expires:{' '}
                        <span className="text-fg-secondary tabular-nums">
                          {new Date(rec.expires_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </p>
                    )}
                    {rec.authorization_status === 'expired' && rec.expires_at && (
                      <p className="text-[11px] text-severity-critical">
                        Expired at {new Date(rec.expires_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })()}

      {/* ── P11: Execution Review ── */}
      {(() => {
        const allExec: ExecutionRecord[] = [
          ...executionData.blocked,
          ...executionData.eligible,
          ...executionData.executing,
          ...executionData.queued,
          ...executionData.failed,
          ...executionData.completed,
        ]
        if (allExec.length === 0) return null

        return (
          <section id="execution" className="space-y-3 scroll-mt-4">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-accent" />
              <h2 className="text-[13px] font-semibold text-fg-secondary">Execution Review</h2>
              <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium text-fg-muted">
                {executionData.eligible.length} eligible
                &nbsp;&middot;&nbsp;
                {executionData.blocked.length} blocked
                &nbsp;&middot;&nbsp;
                {executionData.completed.length} completed
              </span>
            </div>

            <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface overflow-hidden">
              {allExec.map(rec => {
                const statusMeta: Record<string, { badge: string; label: string }> = {
                  eligible:  { badge: 'bg-severity-success/10 text-severity-success', label: 'Eligible' },
                  executing: { badge: 'bg-severity-warn/10 text-severity-warn',       label: 'Executing' },
                  completed: { badge: 'bg-severity-success/10 text-severity-success', label: 'Completed' },
                  queued:    { badge: 'bg-elevated text-fg-muted',                    label: 'Queued' },
                  failed:    { badge: 'bg-severity-critical/10 text-severity-critical', label: 'Failed' },
                  blocked:   { badge: 'bg-severity-critical/10 text-severity-critical', label: 'Blocked' },
                }
                const meta = statusMeta[rec.execution_status] ?? statusMeta.queued

                return (
                  <div key={rec.execution_id} className="px-3 py-3 space-y-1.5">
                    {/* Row 1: title + status badge */}
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13px] font-medium text-fg-primary truncate flex-1">
                        {rec.operation_title}
                      </p>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </div>

                    {/* Row 2: authority status + mode */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-fg-muted">
                      <span>Authority: <span className="text-fg-secondary font-medium capitalize">{rec.authority_status}</span></span>
                      <span>Mode: <span className="text-fg-secondary">{rec.mode_id}</span></span>
                      <span>Governance: <span className="text-fg-secondary capitalize">{rec.governance_verdict}</span></span>
                      {rec.read_only && (
                        <span className="text-accent">Read-only</span>
                      )}
                    </div>

                    {/* Row 3: execution reason */}
                    <p className="text-[11px] text-fg-secondary">{rec.execution_reason}</p>

                    {/* Row 4: timing */}
                    {rec.completed_at && (
                      <p className="text-[11px] text-fg-muted tabular-nums">
                        Completed:{' '}
                        <span className="text-fg-secondary">
                          {new Date(rec.completed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                        {rec.duration_ms != null && ` — ${rec.duration_ms}ms`}
                      </p>
                    )}
                    {rec.result_summary && (
                      <p className="text-[11px] text-fg-secondary italic">{rec.result_summary}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })()}

      {/* ── P12: Learning Review ── */}
      {learningData.records.length > 0 && (
        <section id="learning" className="space-y-3 scroll-mt-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="text-[13px] font-semibold text-fg-secondary">Learning Review</h2>
            <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium text-fg-muted">
              {learningData.learning_count} learnings
              &nbsp;&middot;&nbsp;
              Rec Quality: {learningData.recommendation_quality}%
            </span>
          </div>

          {/* Engine summary bar */}
          <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden">
            <div className="px-3 py-2 border-b border-border-subtle flex flex-wrap gap-x-4 gap-y-1">
              <span className="text-[11px] font-semibold text-fg-secondary uppercase tracking-wide">Engine Summary</span>
              <span className="text-[11px] text-severity-success flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {learningData.success_patterns.length} success pattern{learningData.success_patterns.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[11px] text-severity-critical flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                {learningData.failure_patterns.length} failure pattern{learningData.failure_patterns.length !== 1 ? 's' : ''}
              </span>
            </div>
            {learningData.top_insights.length > 0 && (
              <div className="divide-y divide-border-subtle">
                {learningData.top_insights.slice(0, 3).map((ins, i) => (
                  <div key={i} className="px-3 py-2 flex items-start gap-2">
                    <Sparkles className="h-3 w-3 mt-0.5 text-accent shrink-0" />
                    <p className="text-[12px] text-fg-secondary">{ins}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Per-learning rows */}
          <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface overflow-hidden">
            {learningData.records
              .slice()
              .sort((a: LearningRecord, b: LearningRecord) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((rec: LearningRecord) => {
                const outcomeMeta: Record<string, { badge: string; label: string }> = {
                  success:         { badge: 'bg-severity-success/10 text-severity-success',   label: 'Success' },
                  partial_success: { badge: 'bg-severity-warn/10 text-severity-warn',         label: 'Partial' },
                  failure:         { badge: 'bg-severity-critical/10 text-severity-critical', label: 'Failure' },
                  blocked:         { badge: 'bg-severity-critical/10 text-severity-critical', label: 'Blocked' },
                  cancelled:       { badge: 'bg-elevated text-fg-disabled',                   label: 'Cancelled' },
                }
                const meta = outcomeMeta[rec.outcome] ?? outcomeMeta.cancelled

                return (
                  <div key={rec.learning_id} className="px-3 py-3 space-y-1.5">
                    {/* Row 1: title + outcome badge */}
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13px] font-medium text-fg-primary truncate flex-1">
                        {rec.operation_title}
                      </p>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </div>

                    {/* Row 2: learning type + confidence */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-fg-muted">
                      <span>Type: <span className="text-fg-secondary font-medium capitalize">{rec.learning_type}</span></span>
                      <span>Confidence: <span className="text-fg-secondary tabular-nums">{rec.confidence}%</span></span>
                      <span>Success: <span className="text-severity-success tabular-nums">{rec.success_score}</span></span>
                      <span>Failure: <span className="text-severity-critical tabular-nums">{rec.failure_score}</span></span>
                    </div>

                    {/* Row 3: insight */}
                    <p className="text-[12px] text-fg-secondary leading-relaxed">{rec.insight}</p>

                    {/* Row 4: recommendation */}
                    {rec.recommendation && (
                      <div className="rounded-md bg-accent/[0.04] border border-accent/10 px-2.5 py-1.5">
                        <p className="text-[11px] text-fg-secondary">
                          <span className="font-semibold text-accent">Rec: </span>
                          {rec.recommendation}
                        </p>
                      </div>
                    )}

                    {/* Row 5: contributing factors + timestamp */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-fg-disabled">
                      {rec.contributing_factors.slice(0, 3).map((f, i) => (
                        <span key={i}>{f}</span>
                      ))}
                      <span className="tabular-nums ml-auto">
                        {new Date(rec.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </section>
      )}

      {/* ── P13: Autonomy Review ── */}
      {autonomyData && (
        <section id="autonomy" className="space-y-3 scroll-mt-4">
          <div className="flex items-center gap-2">
            <AutonomyIcon status={autonomyData.status} />
            <h2 className="text-[13px] font-semibold text-fg-secondary">Autonomy Review</h2>
            <AutonomyBadge status={autonomyData.status} />
          </div>

          {/* Summary card */}
          <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden">
            {/* Header row */}
            <div className="px-3 py-2.5 border-b border-border-subtle flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-[11px] font-semibold text-fg-secondary uppercase tracking-wide">Loop Summary</span>
              <span className="text-[11px] text-fg-muted">
                Mode: <span className="font-semibold text-fg-primary">{autonomyData.active_mode}</span>
              </span>
              <span className="text-[11px] text-fg-disabled tabular-nums ml-auto">
                {new Date(autonomyData.generated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>

            {/* Status + Reason */}
            <div className="px-3 py-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-medium text-fg-primary flex-1">Current Status</p>
                <AutonomyBadge status={autonomyData.status} />
              </div>
              <p className="text-[12px] text-fg-secondary leading-relaxed">{autonomyData.record.reason}</p>
            </div>

            {/* Next Best Action */}
            {autonomyData.next_best_action && (
              <div className="px-3 py-3 border-t border-border-subtle space-y-1">
                <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide">Next Best Action</p>
                <p className="text-[13px] font-semibold text-fg-primary leading-snug">{autonomyData.next_best_action}</p>
              </div>
            )}

            {/* Blocking reason (when applicable) */}
            {autonomyData.blocking_reason && (
              <div className="px-3 py-2.5 border-t border-border-subtle">
                <p className="text-[10px] font-semibold text-severity-warn uppercase tracking-wide mb-1">Blocking Reason</p>
                <p className="text-[12px] text-fg-secondary">{autonomyData.blocking_reason}</p>
              </div>
            )}

            {/* Signal counts */}
            <div className="px-3 py-2.5 border-t border-border-subtle grid grid-cols-2 sm:grid-cols-4 gap-2">
              <AutonomyStat label="Pending Approvals" value={autonomyData.pending_approvals.length}
                cls={autonomyData.pending_approvals.length > 0 ? 'text-severity-warn' : 'text-fg-muted'} />
              <AutonomyStat label="Ready Operations"  value={autonomyData.ready_operations.length}
                cls={autonomyData.ready_operations.length > 0 ? 'text-severity-success' : 'text-fg-muted'} />
              <AutonomyStat label="High Risk Ops"     value={autonomyData.high_risk_operations.length}
                cls={autonomyData.high_risk_operations.length > 0 ? 'text-severity-critical' : 'text-fg-muted'} />
              <AutonomyStat label="Learning Signals"  value={autonomyData.learning_signals.length}
                cls={autonomyData.learning_signals.length > 0 ? 'text-accent' : 'text-fg-muted'} />
            </div>
          </div>

          {/* Pending approvals list */}
          {autonomyData.pending_approvals.length > 0 && (
            <div className="rounded-xl border border-severity-warn/25 bg-severity-warn/[0.02] overflow-hidden">
              <div className="px-3 py-2 border-b border-severity-warn/20">
                <span className="text-[11px] font-semibold text-severity-warn uppercase tracking-wide">
                  Pending Approvals ({autonomyData.pending_approvals.length})
                </span>
              </div>
              <div className="divide-y divide-border-subtle">
                {autonomyData.pending_approvals.map((op, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2.5">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-severity-warn" />
                    <p className="text-[12px] text-fg-primary">{op}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ready operations list */}
          {autonomyData.ready_operations.length > 0 && (
            <div className="rounded-xl border border-severity-success/25 bg-severity-success/[0.02] overflow-hidden">
              <div className="px-3 py-2 border-b border-severity-success/20">
                <span className="text-[11px] font-semibold text-severity-success uppercase tracking-wide">
                  Ready Operations ({autonomyData.ready_operations.length})
                </span>
              </div>
              <div className="divide-y divide-border-subtle">
                {autonomyData.ready_operations.map((op, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-severity-success" />
                    <p className="text-[12px] text-fg-primary">{op}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning signals */}
          {autonomyData.learning_signals.length > 0 && (
            <div className="rounded-xl border border-accent/20 bg-accent/[0.02] overflow-hidden">
              <div className="px-3 py-2 border-b border-accent/15">
                <span className="text-[11px] font-semibold text-accent uppercase tracking-wide">
                  Learning Signals ({autonomyData.learning_signals.length})
                </span>
              </div>
              <div className="divide-y divide-border-subtle">
                {autonomyData.learning_signals.map((sig, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2.5">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                    <p className="text-[12px] text-fg-secondary">{sig}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── P6: Operation History ── */}
      {ops.history.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-fg-muted">
            <HistoryIcon className="h-3.5 w-3.5" /> Operation history
          </div>
          <div className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface">
            {ops.history.slice(0, 10).map((op: Operation) => (
              <OpHistoryRow key={op.operation_id} op={op} />
            ))}
          </div>
        </section>
      )}

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

      {!isDone && (
        <RecDecisionControls
          recommendationId={rec.recommendation_id}
          recTitle={rec.title}
          recCategory={rec.category}
          recRiskLevel={rec.risk_level}
          recSummary={rec.summary}
          sourceTaskId={rec.source_task_id ?? null}
        />
      )}
    </div>
  )
}

// ─── P6: Operation components ─────────────────────────────────────────────────

const OP_STATUS_MAP: Record<OpStatus, { label: string; cls: string }> = {
  queued:    { label: 'Queued',    cls: 'bg-elevated text-fg-muted' },
  ready:     { label: 'Ready',     cls: 'bg-severity-success/10 text-severity-success' },
  executing: { label: 'Executing', cls: 'bg-accent/10 text-accent' },
  completed: { label: 'Completed', cls: 'bg-severity-success/10 text-severity-success' },
  failed:    { label: 'Failed',    cls: 'bg-severity-critical/10 text-severity-critical' },
  blocked:   { label: 'Blocked',   cls: 'bg-fg-disabled/10 text-fg-disabled' },
}

function opStatusBadge(status: OpStatus) {
  const m = OP_STATUS_MAP[status] ?? OP_STATUS_MAP.queued
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${m.cls}`}>
      {m.label}
    </span>
  )
}

// P8 — Governance badge
function GovBadge({ ev }: { ev: GovernanceEvaluation | undefined }) {
  if (!ev) return null
  if (ev.verdict === 'allowed') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-severity-success/10 px-2 py-0.5 text-[10px] font-semibold text-severity-success">
      <CheckSquare className="h-2.5 w-2.5" /> Allowed
    </span>
  )
  if (ev.verdict === 'needs_approval') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-severity-warn/10 px-2 py-0.5 text-[10px] font-semibold text-severity-warn">
      <Clock className="h-2.5 w-2.5" /> Needs Approval
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-severity-critical/10 px-2 py-0.5 text-[10px] font-semibold text-severity-critical">
      <Ban className="h-2.5 w-2.5" /> Blocked
    </span>
  )
}

function ExecReadinessBadge({ entry }: { entry: ScheduleEntry | undefined }) {
  if (!entry) return null
  if (!entry.can_run_now) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-fg-disabled/10 px-2 py-0.5 text-[10px] font-semibold text-fg-disabled">
        <Ban className="h-2.5 w-2.5" /> Blocked
      </span>
    )
  }
  const tierCls = entry.tier === 'critical' ? 'bg-severity-critical/10 text-severity-critical'
    : entry.tier === 'high'     ? 'bg-severity-warn/10 text-severity-warn'
    : entry.tier === 'medium'   ? 'bg-accent/10 text-accent'
    : 'bg-elevated text-fg-muted'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tierCls}`}>
      <PlayCircle className="h-2.5 w-2.5" /> Ready · {entry.priority_score}/100
    </span>
  )
}

function OpCard({ op, schedule, governance }: { op: Operation; schedule?: ScheduleEntry; governance?: GovernanceEvaluation }) {
  const cardBorderCls = governance?.verdict === 'blocked'
    ? 'border-severity-critical/25 bg-severity-critical/[0.02]'
    : governance?.verdict === 'needs_approval'
    ? 'border-severity-warn/25 bg-severity-warn/[0.02]'
    : 'border-severity-success/20 bg-severity-success/[0.02]'

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${cardBorderCls}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-elevated">
            <ListChecks className="h-4 w-4 text-severity-success" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-fg-primary">{op.title}</p>
            <p className="text-[11px] text-fg-disabled capitalize">{op.category} · {op.execution_mode}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {opStatusBadge(op.status)}
          <ExecReadinessBadge entry={schedule} />
          <GovBadge ev={governance} />
        </div>
      </div>

      <p className="text-[12px] text-fg-secondary">{op.description}</p>

      {/* P7 schedule intel */}
      {schedule && (
        <div className="rounded-lg bg-elevated px-3 py-2 space-y-1">
          <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide">Execution Readiness</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-fg-secondary">
            <span><span className="text-fg-disabled">Priority: </span><span className="font-semibold tabular-nums">{schedule.priority_score}/100</span></span>
            <span><span className="text-fg-disabled">Urgency: </span><span className="tabular-nums">{schedule.urgency_score}/100</span></span>
            <span><span className="text-fg-disabled">Value: </span><span className="tabular-nums">{schedule.founder_value_score}/100</span></span>
            <span><span className="text-fg-disabled">Exec risk: </span><span className="tabular-nums">{schedule.risk_score}/100</span></span>
          </div>
          <p className="text-[11px] text-fg-muted">{schedule.reason}</p>
          <p className="text-[11px]">
            <span className="text-fg-disabled">Impact: </span>
            <span className="text-fg-secondary">{schedule.expected_impact}</span>
          </p>
          {!schedule.can_run_now && schedule.blocked_by.length > 0 && (
            <p className="text-[11px] text-severity-warn">⚠ Blocked by {schedule.blocked_by.length} prerequisite</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-muted">
        <span>Risk: {op.risk_level}</span>
        <span>Created {timeAgo(op.created_at)}</span>
        <span className="font-mono text-fg-disabled">{op.operation_id}</span>
      </div>

      {/* P8 governance reason */}
      {governance && (
        <div className="rounded-lg bg-elevated px-3 py-2 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3 w-3 text-fg-disabled shrink-0" />
            <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide">Governance</p>
            <span className="ml-auto text-[10px] text-fg-muted">{governance.policy_name}</span>
          </div>
          <p className="text-[11px] text-fg-secondary">{governance.reason}</p>
        </div>
      )}

      {op.replay_id && (
        <a
          href={`/founder/replay?task_id=${op.replay_id}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
        >
          View source replay <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  )
}

function OpHistoryRow({ op }: { op: Operation }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5 text-[12px]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-fg-secondary">
          <span className="font-medium text-fg-primary">{op.title}</span>
        </p>
        <p className="truncate text-[11px] text-fg-disabled">
          {op.category} · {timeAgo(op.approved_at)}
        </p>
      </div>
      {opStatusBadge(op.status)}
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

// ── P13: Autonomy helpers ───────────────────────────────────────────────────────────────────

const AUTONOMY_BADGE: Record<AutonomyStatus, { cls: string; label: string }> = {
  ready:               { cls: 'bg-severity-success/10 text-severity-success', label: 'Ready' },
  waiting_for_founder: { cls: 'bg-severity-warn/10 text-severity-warn',       label: 'Waiting for Founder' },
  monitoring:          { cls: 'bg-blue-400/10 text-blue-400',                  label: 'Monitoring' },
  blocked:             { cls: 'bg-severity-critical/10 text-severity-critical', label: 'Blocked' },
  idle:                { cls: 'bg-elevated text-fg-muted',                      label: 'Idle' },
}

function AutonomyBadge({ status }: { status: AutonomyStatus }) {
  const m = AUTONOMY_BADGE[status] ?? AUTONOMY_BADGE.idle
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${m.cls}`}>
      {m.label}
    </span>
  )
}

function AutonomyIcon({ status }: { status: AutonomyStatus }) {
  if (status === 'ready')               return <CheckCircle2 className="h-4 w-4 text-severity-success" />
  if (status === 'waiting_for_founder') return <Clock className="h-4 w-4 text-severity-warn" />
  if (status === 'monitoring')          return <AlertCircle className="h-4 w-4 text-blue-400" />
  if (status === 'blocked')             return <XCircle className="h-4 w-4 text-severity-critical" />
  return                                       <AlertCircle className="h-4 w-4 text-fg-muted" />
}

function AutonomyStat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-fg-disabled uppercase tracking-wide">{label}</span>
      <span className={`text-[15px] font-bold tabular-nums leading-none ${cls}`}>{value}</span>
    </div>
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
