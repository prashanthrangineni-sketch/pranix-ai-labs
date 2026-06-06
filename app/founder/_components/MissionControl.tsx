'use client'
// app/founder/_components/MissionControl.tsx
// P4 + P5 — Founder Mission Control.
// Polls GET /api/founder/overview every 30s and renders a push-style executive
// dashboard. Also polls GET /api/founder/recommendations every 60s and renders
// a Recommendation Inbox sorted by severity.
// Read-only — zero write calls here.

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ShieldCheck, Loader2, RefreshCw, AlertOctagon, CheckCircle2,
  Zap, Activity, ListChecks, ClipboardList, ChevronRight,
  AlertTriangle, Lightbulb, BrainCircuit, Sunrise, Circle,
  Inbox, FlameKindling, AlertCircle, Info,
} from 'lucide-react'
import type { Recommendation, RiskLevel } from '@/app/api/founder/recommendations/route'
import type { Operation as OpItem }    from '@/app/api/founder/operations/route'
import type { ScheduleEntry }           from '@/app/api/founder/scheduler/route'
import type { GovernanceEvaluation, Policy } from '@/app/api/founder/governance/route'

// ── Types ────────────────────────────────────────────────────────────────
interface ApprovalItem  { task_id: string; title: string; goal: string; created_at: string }
interface ActiveItem    { task_id: string; title: string; status: string; created_at: string }
interface FailureItem   { task_id: string; title: string; updated_at: string }
interface ProviderItem  { name: string; status: string; updated_at: string }
interface FeedItem      { id: string; kind: string; label: string; sub: string; timestamp: string; task_id: string }
interface DecisionItem  { task_id: string; decision: string; reasoning: string; timestamp: string }
interface RiskItem      { task_id: string; risk: string; timestamp: string }
interface RecItem       { task_id: string; recommendation: string; timestamp: string }

interface OverviewData {
  approvals:       ApprovalItem[]
  active_tasks:    ActiveItem[]
  failures:        FailureItem[]
  completed_today: number
  providers:       ProviderItem[]
  feed:            FeedItem[]
  decisions:       DecisionItem[]
  risks:           RiskItem[]
  recommendations: RecItem[]
  morning_focus:   string[]
  generated_at:    string
}

// ── Helpers ───────────────────────────────────────────────────────────────
function relTime(iso: string) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m    = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const PROVIDER_LABELS: Record<string, string> = {
  deterministic: 'Pranix Native',
  groq:          'Groq',
  openrouter:    'OpenRouter',
  gemini:        'Gemini',
  jina:          'Jina',
  ollama:        'Ollama',
  nvidia:        'NVIDIA',
  kimi:          'Kimi',
  anthropic:     'Anthropic',
  openai:        'OpenAI',
  grok:          'Grok',
  perplexity:    'Perplexity',
}

function providerDot(status: string): string {
  if (status === 'ok')                                              return 'bg-severity-success'
  if (status === 'offline' || status === 'disabled_billing_required') return 'bg-severity-critical'
  if (status === 'free_models_only' || status === 'configured')    return 'bg-severity-warn'
  return 'bg-fg-disabled'
}
function providerStatusLabel(status: string): { label: string; cls: string } {
  const m: Record<string, { label: string; cls: string }> = {
    ok:                          { label: 'Available',   cls: 'text-severity-success' },
    offline:                     { label: 'Offline',     cls: 'text-severity-critical' },
    free_models_only:            { label: 'Free only',   cls: 'text-severity-warn' },
    configured:                  { label: 'Configured',  cls: 'text-severity-warn' },
    disabled_billing_required:   { label: 'Missing Key', cls: 'text-severity-critical' },
    disabled_free_only_policy:   { label: 'Disabled',    cls: 'text-fg-disabled' },
    disabled_paid_model_only:    { label: 'Disabled',    cls: 'text-fg-disabled' },
  }
  return m[status] ?? { label: status, cls: 'text-fg-muted' }
}

function feedKindStyle(kind: string): { dot: string; label: string } {
  const m: Record<string, { dot: string; label: string }> = {
    completed:       { dot: 'bg-severity-success', label: 'Completed' },
    failed:          { dot: 'bg-severity-critical', label: 'Failed' },
    approved:        { dot: 'bg-accent',            label: 'Approved' },
    started:         { dot: 'bg-accent',            label: 'Started' },
    planned:         { dot: 'bg-severity-warn',     label: 'Planned' },
    analysis:        { dot: 'bg-purple-400',        label: 'Analysis' },
    risk:            { dot: 'bg-severity-warn',     label: 'Risk' },
    recommendation:  { dot: 'bg-blue-400',          label: 'Recommendation' },
    step_done:       { dot: 'bg-severity-success',  label: 'Step done' },
    step_failed:     { dot: 'bg-severity-critical', label: 'Step failed' },
  }
  return m[kind] ?? { dot: 'bg-fg-disabled', label: kind }
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function McPanel({ title, icon: Icon, iconColor = 'text-fg-muted', children, link, linkHref }: {
  title: string
  icon: React.ElementType
  iconColor?: string
  children: React.ReactNode
  link?: string
  linkHref?: string
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Icon className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} />
          <span className="text-[12px] font-semibold text-fg-primary uppercase tracking-wide">{title}</span>
        </div>
        {link && linkHref && (
          <Link href={linkHref} className="flex items-center gap-0.5 text-[11px] text-accent hover:text-accent/80 transition-colors">
            {link} <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function CountCard({ value, label, sub, valueClass, icon: Icon, iconBg }: {
  value: number | string
  label: string
  sub: string
  valueClass: string
  icon: React.ElementType
  iconBg: string
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-fg-muted mb-0.5">{label}</p>
        <p className={`text-xl font-bold leading-none tabular-nums ${valueClass}`}>{value}</p>
        <p className="text-[11px] text-fg-disabled mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

// ── P5: Recommendation severity helpers ───────────────────────────────────────
const RISK_META: Record<RiskLevel, { label: string; row: string; icon: React.ElementType }> = {
  critical: { label: 'Critical', row: 'border-severity-critical/25 bg-severity-critical/[0.04]', icon: FlameKindling },
  high:     { label: 'High',     row: 'border-severity-warn/25 bg-severity-warn/[0.04]',       icon: AlertTriangle   },
  medium:   { label: 'Medium',   row: 'border-yellow-400/25 bg-yellow-400/[0.04]',             icon: AlertCircle     },
  low:      { label: 'Low',      row: 'border-border-subtle bg-surface',                      icon: Info            },
}

function RecRow({ rec }: { rec: Recommendation }) {
  const meta  = RISK_META[rec.risk_level] ?? RISK_META.low
  const RIcon = meta.icon
  const isDone = rec.status !== 'pending'
  const iconCls = rec.risk_level === 'critical' ? 'text-severity-critical'
    : rec.risk_level === 'high'   ? 'text-severity-warn'
    : rec.risk_level === 'medium' ? 'text-yellow-400'
    : 'text-fg-disabled'
  return (
    <Link
      href="/founder/approvals#recommendations"
      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors hover:brightness-95 ${
        isDone ? 'opacity-50 border-border-subtle bg-surface' : meta.row
      }`}
    >
      <RIcon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isDone ? 'text-fg-disabled' : iconCls}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-[12px] font-medium leading-snug ${isDone ? 'text-fg-disabled line-through' : 'text-fg-primary'}`}>
          {rec.title}
        </p>
        <p className="text-[10px] text-fg-muted mt-0.5">
          {isDone
            ? rec.status.charAt(0).toUpperCase() + rec.status.slice(1)
            : `Risk: ${meta.label} · ${rec.category}`
          }
        </p>
      </div>
      {!isDone && <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-disabled" />}
    </Link>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function MissionControl() {
  const [data, setData]       = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // P5 — Recommendation Inbox
  const [recs, setRecs] = useState<Recommendation[]>([])

  // P6 — Operations Queue
  const [ops, setOps] = useState<{
    ready: OpItem[]; executing: OpItem[]; completed: OpItem[]; blocked: OpItem[]; queued: OpItem[]
  }>({ ready: [], executing: [], completed: [], blocked: [], queued: [] })

  const loadRecs = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/recommendations', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      setRecs(j.recommendations ?? [])
    } catch { /* non-fatal */ }
  }, [])

  const loadOps = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/operations', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      setOps({
        ready:     j.ready     ?? [],
        executing: j.executing ?? [],
        completed: j.completed ?? [],
        blocked:   j.blocked   ?? [],
        queued:    j.queued    ?? [],
      })
    } catch { /* non-fatal */ }
  }, [])

  // P7 — Scheduler
  const [schedule, setSchedule] = useState<{
    next_best_action:  ScheduleEntry | null
    ready_now:         ScheduleEntry[]
    workload_score:    number
    system_risk_score: number
  }>({ next_best_action: null, ready_now: [], workload_score: 0, system_risk_score: 0 })

  const loadSchedule = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/scheduler', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      setSchedule({
        next_best_action:  j.next_best_action  ?? null,
        ready_now:         j.ready_now         ?? [],
        workload_score:    j.workload_score     ?? 0,
        system_risk_score: j.system_risk_score  ?? 0,
      })
    } catch { /* non-fatal */ }
  }, [])

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/founder/overview', { cache: 'no-store' })
      if (!res.ok) { setError('Could not load overview'); return }
      setData(await res.json())
      setLastRefresh(new Date())
    } catch { setError('Network error') }
    finally { if (!silent) setLoading(false) }
  }, [])

  useEffect(() => { load(); loadRecs(); loadOps(); loadSchedule() }, [load, loadRecs, loadOps, loadSchedule])
  // auto-refresh every 30s (overview) / 60s (recs + ops + schedule)
  useEffect(() => {
    const t = setInterval(() => load(true), 30_000)
    return () => clearInterval(t)
  }, [load])
  useEffect(() => {
    const t = setInterval(() => { loadRecs(); loadOps(); loadSchedule() }, 60_000)
    return () => clearInterval(t)
  }, [loadRecs, loadOps, loadSchedule])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-fg-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-[13px]">Loading Mission Control…</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-severity-critical">
        <AlertOctagon className="h-5 w-5" />
        <span className="text-[13px]">{error ?? 'No data'}</span>
        <button onClick={() => load()} className="ml-2 text-accent text-[12px] underline">Retry</button>
      </div>
    )
  }

  const { approvals, active_tasks, failures, completed_today,
          providers, feed, decisions, risks, recommendations, morning_focus } = data

  const decisionCounts: Record<string, number> = {}
  for (const d of decisions) {
    decisionCounts[d.decision] = (decisionCounts[d.decision] ?? 0) + 1
  }

  return (
    <div className="space-y-5">

      {/* ── Morning Focus ── */}
      <div className="rounded-xl border border-accent/20 bg-accent/[0.04] px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Sunrise className="h-4 w-4 text-accent" />
          <span className="text-[12px] font-semibold text-fg-primary uppercase tracking-wide">Today’s Focus</span>
          {lastRefresh && (
            <span className="ml-auto text-[10px] text-fg-disabled flex items-center gap-1">
              <RefreshCw className="h-2.5 w-2.5" /> {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <ul className="space-y-1">
          {morning_focus.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] text-fg-secondary">
              <Circle className="mt-1 h-1.5 w-1.5 shrink-0 fill-accent text-accent" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ── P7: Next Best Action ── */}
      {schedule.next_best_action && (() => {
        const nba = schedule.next_best_action
        const tierCls: Record<string, string> = {
          critical: 'border-severity-critical/30 bg-severity-critical/[0.04]',
          high:     'border-severity-warn/30 bg-severity-warn/[0.04]',
          medium:   'border-accent/25 bg-accent/[0.03]',
          low:      'border-border-subtle bg-surface',
        }
        const tierLabel: Record<string, { txt: string; cls: string }> = {
          critical: { txt: 'Critical',  cls: 'text-severity-critical bg-severity-critical/10' },
          high:     { txt: 'High',      cls: 'text-severity-warn bg-severity-warn/10' },
          medium:   { txt: 'Medium',    cls: 'text-accent bg-accent/10' },
          low:      { txt: 'Low',       cls: 'text-fg-muted bg-elevated' },
        }
        const tl = tierLabel[nba.tier] ?? tierLabel.low
        const impactCls = nba.founder_value_score >= 65 ? 'text-severity-success'
          : nba.founder_value_score >= 50 ? 'text-accent' : 'text-fg-muted'
        return (
          <div className={`rounded-xl border px-4 py-3 ${tierCls[nba.tier] ?? tierCls.low}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="text-[11px] font-semibold text-fg-primary uppercase tracking-wide">Next Best Action</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tl.cls}`}>
                  {tl.txt}
                </span>
                <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-semibold text-fg-muted tabular-nums">
                  #{nba.execution_order} · {nba.priority_score}/100
                </span>
              </div>
            </div>

            <p className="text-[14px] font-semibold text-fg-primary leading-snug mb-1">{nba.title}</p>
            <p className="text-[12px] text-fg-secondary mb-2">{nba.reason}</p>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              <span>Impact: <span className={`font-medium ${impactCls}`}>{nba.expected_impact.split('—')[0].trim()}</span></span>
              <span>Risk: <span className="font-medium text-fg-secondary capitalize">{nba.risk_level}</span></span>
              <span>Urgency: <span className="font-medium text-fg-secondary tabular-nums">{nba.urgency_score}/100</span></span>
            </div>

            <div className="mt-2.5 flex items-center gap-1.5">
              <Link
                href="/founder/approvals#operations"
                className="inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent hover:bg-accent/20 transition-colors"
              >
                View in queue <ChevronRight className="h-3 w-3" />
              </Link>
              {schedule.ready_now.length > 1 && (
                <span className="text-[11px] text-fg-disabled">
                  +{schedule.ready_now.length - 1} more ready
                </span>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Count cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CountCard
          value={approvals.length} label="Pending Approvals"
          sub={approvals.length > 0 ? 'Needs decision' : 'Queue clear'}
          valueClass={approvals.length > 0 ? 'text-severity-warn' : 'text-fg-primary'}
          icon={ShieldCheck} iconBg={approvals.length > 0 ? 'bg-severity-warn/15 text-severity-warn' : 'bg-elevated text-fg-muted'}
        />
        <CountCard
          value={active_tasks.length} label="Active Tasks"
          sub={active_tasks.length > 0 ? 'Executing now' : 'Idle'}
          valueClass={active_tasks.length > 0 ? 'text-accent' : 'text-fg-primary'}
          icon={Activity} iconBg={active_tasks.length > 0 ? 'bg-accent/10 text-accent' : 'bg-elevated text-fg-muted'}
        />
        <CountCard
          value={failures.length} label="Failed Tasks"
          sub={failures.length > 0 ? 'Review required' : 'No failures'}
          valueClass={failures.length > 0 ? 'text-severity-critical' : 'text-severity-success'}
          icon={AlertOctagon} iconBg={failures.length > 0 ? 'bg-severity-critical/10 text-severity-critical' : 'bg-elevated text-fg-muted'}
        />
        <CountCard
          value={completed_today} label="Completed Today"
          sub="Since midnight"
          valueClass={completed_today > 0 ? 'text-severity-success' : 'text-fg-primary'}
          icon={CheckCircle2} iconBg={completed_today > 0 ? 'bg-severity-success/10 text-severity-success' : 'bg-elevated text-fg-muted'}
        />
      </div>

      {/* ── P5: Recommendation Inbox ── */}
      {recs.length > 0 && (
        <McPanel
          title="Recommendation Inbox"
          icon={Inbox}
          iconColor="text-accent"
          link="Review all"
          linkHref="/founder/approvals#recommendations"
        >
          {/* Severity header */}
          {(() => {
            const pending = recs.filter(r => r.status === 'pending')
            const critical = pending.filter(r => r.risk_level === 'critical').length
            const high     = pending.filter(r => r.risk_level === 'high').length
            const medium   = pending.filter(r => r.risk_level === 'medium').length
            const low      = pending.filter(r => r.risk_level === 'low').length
            return (
              <>
                {pending.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {critical > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-severity-critical/10 px-2 py-0.5 text-[10px] font-semibold text-severity-critical"><FlameKindling className="h-3 w-3" /> {critical} Critical</span>}
                    {high     > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-severity-warn/10 px-2 py-0.5 text-[10px] font-semibold text-severity-warn"><AlertTriangle className="h-3 w-3" /> {high} High</span>}
                    {medium   > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-500"><AlertCircle className="h-3 w-3" /> {medium} Medium</span>}
                    {low      > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[10px] font-semibold text-fg-muted"><Info className="h-3 w-3" /> {low} Low</span>}
                  </div>
                )}
                <div className="space-y-2">
                  {recs.slice(0, 6).map(r => <RecRow key={r.recommendation_id} rec={r} />)}
                  {recs.length > 6 && (
                    <p className="text-[11px] text-fg-disabled pl-1">+{recs.length - 6} more in Approval Center</p>
                  )}
                </div>
              </>
            )
          })()}
        </McPanel>
      )}

      {/* ── P6: Operations Queue ── */}
      {(() => {
        const activeOps = [...ops.ready, ...ops.executing, ...ops.queued]
        const allOps    = [...activeOps, ...ops.completed, ...ops.blocked]
        if (allOps.length === 0) return null
        return (
          <McPanel
            title="Operations Queue"
            icon={ListChecks}
            iconColor="text-severity-success"
            link="View all"
            linkHref="/founder/approvals#operations"
          >
            {/* Status summary row */}
            <div className="flex flex-wrap gap-2 mb-3">
              {ops.ready.length     > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-severity-success/10 px-2 py-0.5 text-[10px] font-semibold text-severity-success">
                  ● {ops.ready.length} Ready
                </span>
              )}
              {ops.executing.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  ◎ {ops.executing.length} Executing
                </span>
              )}
              {ops.completed.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[10px] font-semibold text-fg-muted">
                  ✓ {ops.completed.length} Done today
                </span>
              )}
              {ops.blocked.length   > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-fg-disabled/10 px-2 py-0.5 text-[10px] font-semibold text-fg-disabled">
                  ⊘ {ops.blocked.length} Blocked
                </span>
              )}
            </div>
            {/* Top 5 active ops */}
            <div className="space-y-1.5">
              {activeOps.slice(0, 5).map(op => (
                <Link
                  key={op.operation_id}
                  href="/founder/approvals#operations"
                  className="flex items-center gap-2.5 rounded-lg border border-severity-success/20 bg-severity-success/[0.03] px-3 py-2 hover:bg-severity-success/[0.07] transition-colors"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-severity-success shrink-0" />
                  <p className="flex-1 min-w-0 truncate text-[12px] font-medium text-fg-primary">{op.title}</p>
                  <span className="shrink-0 text-[10px] font-medium text-fg-disabled capitalize">{op.status}</span>
                  <ChevronRight className="h-3 w-3 shrink-0 text-fg-disabled" />
                </Link>
              ))}
              {activeOps.length > 5 && (
                <p className="text-[11px] text-fg-disabled pl-1">+{activeOps.length - 5} more operations</p>
              )}
              {activeOps.length === 0 && ops.completed.length > 0 && (
                <p className="text-[12px] text-fg-muted">All operations completed today.</p>
              )}
            </div>
          </McPanel>
        )
      })()}

      {/* ── Row: Approvals + Provider Status ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Approval inbox */}
        <McPanel title="Approval Inbox" icon={ShieldCheck} iconColor="text-severity-warn"
                 link="Open center" linkHref="/founder/approvals">
          {approvals.length === 0 ? (
            <p className="text-[12px] text-fg-muted">No pending approvals — inbox clear.</p>
          ) : (
            <div className="space-y-2">
              {approvals.map(a => (
                <Link key={a.task_id} href="/founder/approvals"
                      className="flex items-start gap-2.5 rounded-lg border border-severity-warn/20 bg-severity-warn/[0.04] px-3 py-2 hover:bg-severity-warn/[0.08] transition-colors">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-severity-warn" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-fg-primary truncate">{a.title}</p>
                    <p className="text-[10px] text-fg-muted">{relTime(a.created_at)}</p>
                  </div>
                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-disabled" />
                </Link>
              ))}
            </div>
          )}
        </McPanel>

        {/* Provider Status */}
        <McPanel title="Provider Status" icon={Zap} iconColor="text-accent">
          <div className="space-y-2">
            {providers.length === 0 ? (
              <p className="text-[12px] text-fg-muted">No provider data yet.</p>
            ) : providers.map(p => {
              const sl = providerStatusLabel(p.status)
              return (
                <div key={p.name} className="flex items-center gap-2.5">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${providerDot(p.status)}`} />
                  <span className="flex-1 text-[12px] text-fg-secondary">
                    {PROVIDER_LABELS[p.name] ?? p.name}
                  </span>
                  <span className={`text-[11px] font-medium ${sl.cls}`}>{sl.label}</span>
                </div>
              )
            })}
          </div>
        </McPanel>
      </div>

      {/* ── Row: Founder Feed + Decision Inbox ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Founder Feed */}
        <McPanel title="Founder Feed" icon={Activity} iconColor="text-accent"
                 link="View tasks" linkHref="/founder/tasks">
          {feed.length === 0 ? (
            <p className="text-[12px] text-fg-muted">No events yet — run a task to start the feed.</p>
          ) : (
            <div className="space-y-3">
              {feed.slice(0, 12).map(item => {
                const ks = feedKindStyle(item.kind)
                return (
                  <div key={item.id} className="flex gap-2.5">
                    <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${ks.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-fg-primary leading-snug">{item.label}</p>
                      {item.sub && <p className="text-[11px] text-fg-muted truncate">{item.sub}</p>}
                    </div>
                    <span className="text-[10px] text-fg-disabled shrink-0">{relTime(item.timestamp)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </McPanel>

        {/* Decision Inbox */}
        <McPanel title="Decision Inbox" icon={BrainCircuit} iconColor="text-purple-400">
          <div className="space-y-4">

            {/* Decision counts */}
            {Object.keys(decisionCounts).length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-fg-muted mb-2">Decision Distribution</p>
                <div className="space-y-1.5">
                  {Object.entries(decisionCounts).map(([dec, cnt]) => (
                    <div key={dec} className="flex items-center justify-between">
                      <span className="text-[11px] text-fg-secondary font-mono">{dec}</span>
                      <span className="text-[11px] font-semibold text-fg-primary tabular-nums">{cnt}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risks */}
            {risks.length > 0 && (
              <div>
                <p className="flex items-center gap-1 text-[11px] font-semibold text-severity-warn mb-1.5">
                  <AlertTriangle className="h-3 w-3" /> Risks ({risks.length})
                </p>
                <div className="space-y-1">
                  {risks.slice(0, 4).map((r, i) => (
                    <p key={i} className="text-[11px] text-fg-secondary leading-snug">• {r.risk}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div>
                <p className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 mb-1.5">
                  <Lightbulb className="h-3 w-3" /> Recommendations ({recommendations.length})
                </p>
                <div className="space-y-1">
                  {recommendations.slice(0, 4).map((r, i) => (
                    <p key={i} className="text-[11px] text-fg-secondary leading-snug">• {r.recommendation}</p>
                  ))}
                </div>
              </div>
            )}

            {decisions.length === 0 && risks.length === 0 && recommendations.length === 0 && (
              <p className="text-[12px] text-fg-muted">No decisions yet — run an analysis task.</p>
            )}
          </div>
        </McPanel>
      </div>

      {/* ── Active + Failed tasks ── */}
      {(active_tasks.length > 0 || failures.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {active_tasks.length > 0 && (
            <McPanel title="Active Tasks" icon={ListChecks} iconColor="text-accent"
                     link="View all" linkHref="/founder/tasks">
              <div className="space-y-2">
                {active_tasks.map(t => (
                  <div key={t.task_id} className="flex items-start gap-2 rounded-lg border border-accent/20 bg-accent/[0.04] px-3 py-2">
                    <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-fg-primary truncate">{t.title}</p>
                      <p className="text-[10px] text-fg-muted">{t.status} · {relTime(t.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </McPanel>
          )}

          {failures.length > 0 && (
            <McPanel title="Failed Tasks" icon={AlertOctagon} iconColor="text-severity-critical"
                     link="Open approvals" linkHref="/founder/approvals">
              <div className="space-y-2">
                {failures.map(t => (
                  <div key={t.task_id} className="flex items-start gap-2 rounded-lg border border-severity-critical/20 bg-severity-critical/[0.04] px-3 py-2">
                    <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-severity-critical" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-fg-primary truncate">{t.title}</p>
                      <p className="text-[10px] text-fg-muted">{relTime(t.updated_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </McPanel>
          )}
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="rounded-xl border border-border-subtle bg-surface p-4">
        <p className="text-[12px] font-semibold text-fg-muted uppercase tracking-wide mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Open Ask',       href: '/founder/ask',       icon: BrainCircuit, cls: 'text-accent border-accent/30 hover:bg-accent/10' },
            { label: 'Open Approvals', href: '/founder/approvals',  icon: ShieldCheck,  cls: 'text-severity-warn border-severity-warn/30 hover:bg-severity-warn/10' },
            { label: 'Open Tasks',     href: '/founder/tasks',      icon: ListChecks,   cls: 'text-fg-secondary border-border-strong hover:bg-elevated' },
            { label: 'Open Timeline',  href: '/founder/timeline',   icon: ClipboardList,cls: 'text-fg-secondary border-border-strong hover:bg-elevated' },
          ].map(a => (
            <Link key={a.label} href={a.href}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-center transition-colors ${a.cls}`}>
              <a.icon className="h-5 w-5" />
              <span className="text-[11px] font-medium leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
