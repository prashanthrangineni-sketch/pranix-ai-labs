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
  ShieldCheck, Shield, Loader2, RefreshCw, AlertOctagon, CheckCircle2,
  Zap, Activity, ListChecks, ClipboardList, ChevronRight,
  AlertTriangle, Lightbulb, BrainCircuit, Sunrise, Circle,
  Inbox, FlameKindling, AlertCircle, Info,
  Eye, Clock, Ban,
} from 'lucide-react'
import type { Recommendation, RiskLevel } from '@/app/api/founder/recommendations/route'
import type { Operation as OpItem }    from '@/app/api/founder/operations/route'
import type { ScheduleEntry }           from '@/app/api/founder/scheduler/route'
import type { GovernanceEvaluation, Policy } from '@/app/api/founder/governance/route'
import type { StateRecord, StateSummary } from '@/app/api/founder/state/route'
import type { FounderMode }                   from '@/app/api/founder/modes/route'
import type { AuthorityRecord }               from '@/app/api/founder/authority/route'
import type { ExecutionRecord }               from '@/app/api/founder/execution/route'
import type { LearningEngine }                from '@/app/api/founder/learning/route'
import type { AutonomyEngine }                from '@/app/api/founder/autonomy/route'
import type { DispatchRecord }                from '@/app/api/founder/dispatch/route'
import type { ActivationRecord }              from '@/app/api/founder/activation/route'
import type { QueueRecord }                   from '@/app/api/founder/queue/route'
import type { ExecutorRecord }                from '@/app/api/founder/executor/route'
import type { RoadmapItem }                   from '@/app/api/founder/roadmap/route'
import { Key, PlayCircle, Sparkles, Send, Map as MapIcon } from 'lucide-react'

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

  // P9 — Founder Mode
  const [activeMode, setActiveMode] = useState<FounderMode | null>(null)

  const loadModes = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/modes', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      setActiveMode(j.active_mode ?? null)
    } catch { /* non-fatal */ }
  }, [])

  // P13 — Autonomy
  const [autonomy, setAutonomy] = useState<Pick<AutonomyEngine,
    'status' | 'next_best_action' | 'blocking_reason' | 'ready_operations' | 'pending_approvals' | 'high_risk_operations' | 'learning_signals'
  > | null>(null)

  const loadAutonomy = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/autonomy', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      setAutonomy({
        status:               j.status               ?? 'idle',
        next_best_action:     j.next_best_action     ?? '',
        blocking_reason:      j.blocking_reason      ?? '',
        ready_operations:     j.ready_operations     ?? [],
        pending_approvals:    j.pending_approvals    ?? [],
        high_risk_operations: j.high_risk_operations ?? [],
        learning_signals:     j.learning_signals     ?? [],
      })
    } catch { /* non-fatal */ }
  }, [])

  // P12 — Learning
  const [learning, setLearning] = useState<Pick<LearningEngine,
    'learning_count' | 'success_patterns' | 'failure_patterns' | 'top_insights' | 'recommendation_quality'
  >>({ learning_count: 0, success_patterns: [], failure_patterns: [], top_insights: [], recommendation_quality: 0 })

  const loadLearning = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/learning', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      setLearning({
        learning_count:         j.learning_count         ?? 0,
        success_patterns:       j.success_patterns       ?? [],
        failure_patterns:       j.failure_patterns       ?? [],
        top_insights:           j.top_insights           ?? [],
        recommendation_quality: j.recommendation_quality ?? 0,
      })
    } catch { /* non-fatal */ }
  }, [])

  // P11 — Execution
  const [execution, setExecution] = useState<{
    queued:    ExecutionRecord[]
    eligible:  ExecutionRecord[]
    executing: ExecutionRecord[]
    completed: ExecutionRecord[]
    failed:    ExecutionRecord[]
    blocked:   ExecutionRecord[]
  }>({ queued: [], eligible: [], executing: [], completed: [], failed: [], blocked: [] })

  const loadExecution = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/execution', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      setExecution({
        queued:    j.queued    ?? [],
        eligible:  j.eligible  ?? [],
        executing: j.executing ?? [],
        completed: j.completed ?? [],
        failed:    j.failed    ?? [],
        blocked:   j.blocked   ?? [],
      })
    } catch { /* non-fatal */ }
  }, [])

  // P10 — Execution Authority
  const [authority, setAuthority] = useState<{
    pending:    AuthorityRecord[]
    authorized: AuthorityRecord[]
    blocked:    AuthorityRecord[]
    expired:    AuthorityRecord[]
    revoked:    AuthorityRecord[]
  }>({ pending: [], authorized: [], blocked: [], expired: [], revoked: [] })

  const loadAuthority = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/authority', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      setAuthority({
        pending:    j.pending    ?? [],
        authorized: j.authorized ?? [],
        blocked:    j.blocked    ?? [],
        expired:    j.expired    ?? [],
        revoked:    j.revoked    ?? [],
      })
    } catch { /* non-fatal */ }
  }, [])

  // S2 — Durable State Health
  const [stateHealth, setStateHealth] = useState<{
    summary: { healthy: number; warning: number; critical: number; expired: number }
    records: StateRecord[]
    scanned_at: string
  }>({
    summary: { healthy: 0, warning: 0, critical: 0, expired: 0 },
    records: [],
    scanned_at: '',
  })

  const loadStateHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/state', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      setStateHealth({
        summary:    j.summary    ?? { healthy: 0, warning: 0, critical: 0, expired: 0 },
        records:    j.records    ?? [],
        scanned_at: j.scanned_at ?? '',
      })
    } catch { /* non-fatal */ }
  }, [])

  // S4 — Activation
  const [activation, setActivation] = useState<{
    pending:    number
    activated:  number
    executing:  number
    completed:  number
    failed:     number
    blocked:    number
    top_active: ActivationRecord | null
    records:    ActivationRecord[]
  }>({ pending: 0, activated: 0, executing: 0, completed: 0, failed: 0, blocked: 0, top_active: null, records: [] })

  const loadActivation = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/activation', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      setActivation({
        pending:    j.pending    ?? 0,
        activated:  j.activated  ?? 0,
        executing:  j.executing  ?? 0,
        completed:  j.completed  ?? 0,
        failed:     j.failed     ?? 0,
        blocked:    j.blocked    ?? 0,
        top_active: j.top_active ?? null,
        records:    j.records    ?? [],
      })
    } catch { /* non-fatal */ }
  }, [])

  // Roadmap
  const [roadmap, setRoadmap] = useState<{
    pct:          number
    total:        number
    completed:    number
    in_progress:  number
    blocked:      number
    current:      RoadmapItem | null
    next:         RoadmapItem | null
    blocked_items: RoadmapItem[]
    milestones:   RoadmapItem[]
    items:        RoadmapItem[]
  }>({ pct: 0, total: 14, completed: 0, in_progress: 0, blocked: 0, current: null, next: null, blocked_items: [], milestones: [], items: [] })

  const loadRoadmap = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/roadmap', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      const p = j.progress ?? {}
      setRoadmap({
        pct:           p.pct          ?? 0,
        total:         p.total        ?? 14,
        completed:     p.completed    ?? 0,
        in_progress:   p.in_progress  ?? 0,
        blocked:       p.blocked      ?? 0,
        current:       p.current      ?? null,
        next:          p.next         ?? null,
        blocked_items: p.blocked_items ?? [],
        milestones:    p.milestones   ?? [],
        items:         j.roadmap      ?? [],
      })
    } catch { /* non-fatal */ }
  }, [])

  // S6 — Executor
  const [executor, setExecutor] = useState<{
    running:     number
    completed:   number
    failed:      number
    blocked:     number
    unverified:  number
    gateway_live: boolean
    top_running: ExecutorRecord | null
    records:     ExecutorRecord[]
  }>({ running: 0, completed: 0, failed: 0, blocked: 0, unverified: 0, gateway_live: false, top_running: null, records: [] })

  const loadExecutor = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/executor', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      setExecutor({
        running:      j.running      ?? 0,
        completed:    j.completed    ?? 0,
        failed:       j.failed       ?? 0,
        blocked:      j.blocked      ?? 0,
        unverified:   j.unverified   ?? 0,
        gateway_live: j.gateway_live ?? false,
        top_running:  j.top_running  ?? null,
        records:      j.records      ?? [],
      })
    } catch { /* non-fatal */ }
  }, [])

  // S5 — Queue
  const [queue, setQueue] = useState<{
    queued:      number
    leased:      number
    executing:   number
    completed:   number
    failed:      number
    dead_letter: number
    top_item:    QueueRecord | null
    records:     QueueRecord[]
  }>({ queued: 0, leased: 0, executing: 0, completed: 0, failed: 0, dead_letter: 0, top_item: null, records: [] })

  const loadQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/queue', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      setQueue({
        queued:      j.queued      ?? 0,
        leased:      j.leased      ?? 0,
        executing:   j.executing   ?? 0,
        completed:   j.completed   ?? 0,
        failed:      j.failed      ?? 0,
        dead_letter: j.dead_letter ?? 0,
        top_item:    j.top_item    ?? null,
        records:     j.records     ?? [],
      })
    } catch { /* non-fatal */ }
  }, [])

  // S3 — Dispatch
  const [dispatch, setDispatch] = useState<{
    queued:        number
    dispatched:    number
    blocked:       number
    eligible:      number
    top_candidate: DispatchRecord | null
    records:       DispatchRecord[]
  }>({ queued: 0, dispatched: 0, blocked: 0, eligible: 0, top_candidate: null, records: [] })

  const loadDispatch = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/dispatch', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      setDispatch({
        queued:        j.queued        ?? 0,
        dispatched:    j.dispatched    ?? 0,
        blocked:       j.blocked       ?? 0,
        eligible:      j.eligible      ?? 0,
        top_candidate: j.top_candidate ?? null,
        records:       j.records       ?? [],
      })
    } catch { /* non-fatal */ }
  }, [])

  // P8 — Governance
  const [governance, setGovernance] = useState<{
    evaluations:             GovernanceEvaluation[]
    violations:              GovernanceEvaluation[]
    approval_required_count: number
    blocked_count:           number
    policies:                Policy[]
  }>({
    evaluations:             [],
    violations:              [],
    approval_required_count: 0,
    blocked_count:           0,
    policies:                [],
  })

  const loadGovernance = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/governance', { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json()
      setGovernance({
        evaluations:             j.evaluations             ?? [],
        violations:              j.violations              ?? [],
        approval_required_count: j.approval_required_count ?? 0,
        blocked_count:           j.blocked_count           ?? 0,
        policies:                j.policies                ?? [],
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

  useEffect(() => { load(); loadRecs(); loadOps(); loadSchedule(); loadGovernance(); loadModes(); loadAuthority(); loadExecution(); loadLearning(); loadAutonomy(); loadStateHealth() }, [load, loadRecs, loadOps, loadSchedule, loadGovernance, loadModes, loadAuthority, loadExecution, loadLearning, loadAutonomy, loadStateHealth])
  // auto-refresh every 30s (overview + autonomy) / 60s (recs + ops + schedule + governance + modes + authority + execution + learning + state)
  useEffect(() => { load(); loadRecs(); loadOps(); loadSchedule(); loadGovernance(); loadModes(); loadAuthority(); loadExecution(); loadLearning(); loadAutonomy(); loadDispatch(); loadActivation(); loadQueue(); loadExecutor(); loadRoadmap() }, [load, loadRecs, loadOps, loadSchedule, loadGovernance, loadModes, loadAuthority, loadExecution, loadLearning, loadAutonomy, loadDispatch, loadActivation, loadQueue, loadExecutor, loadRoadmap])
  // auto-refresh every 30s (overview + autonomy) / 60s (rest)
  useEffect(() => {
    const t = setInterval(() => { load(true); loadAutonomy() }, 30_000)
    return () => clearInterval(t)
  }, [load, loadAutonomy])
  useEffect(() => {
    const t = setInterval(() => { loadRecs(); loadOps(); loadSchedule(); loadGovernance(); loadModes(); loadAuthority(); loadExecution(); loadLearning(); loadStateHealth() }, 60_000)
    return () => clearInterval(t)
  }, [loadRecs, loadOps, loadSchedule, loadGovernance, loadModes, loadAuthority, loadExecution, loadLearning, loadStateHealth])
  useEffect(() => {
    const t = setInterval(() => { loadRecs(); loadOps(); loadSchedule(); loadGovernance(); loadModes(); loadAuthority(); loadExecution(); loadLearning(); loadDispatch(); loadActivation(); loadQueue(); loadExecutor(); loadRoadmap() }, 60_000)
    return () => clearInterval(t)
  }, [loadRecs, loadOps, loadSchedule, loadGovernance, loadModes, loadAuthority, loadExecution, loadLearning, loadDispatch, loadActivation, loadQueue, loadExecutor, loadRoadmap])

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

      {/* ── P9: Operating Mode card ── */}
      {activeMode && (() => {
        const modeColorMap: Record<string, { ring: string; iconCls: string; badgeCls: string }> = {
          MODE_A: { ring: 'border-fg-disabled/30',     iconCls: 'text-fg-muted',           badgeCls: 'bg-elevated text-fg-muted' },
          MODE_B: { ring: 'border-accent/30',          iconCls: 'text-accent',              badgeCls: 'bg-accent/10 text-accent' },
          MODE_C: { ring: 'border-severity-warn/30',   iconCls: 'text-severity-warn',       badgeCls: 'bg-severity-warn/10 text-severity-warn' },
          MODE_D: { ring: 'border-severity-success/30',iconCls: 'text-severity-success',    badgeCls: 'bg-severity-success/10 text-severity-success' },
        }
        const mc = modeColorMap[activeMode.mode_id] ?? modeColorMap.MODE_A
        return (
          <div className={`rounded-xl border ${mc.ring} bg-surface px-4 py-3 space-y-3`}>
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className={`h-3.5 w-3.5 shrink-0 ${mc.iconCls}`} />
                <span className="text-[11px] font-semibold text-fg-primary uppercase tracking-wide">Operating Mode</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${mc.badgeCls}`}>
                  {activeMode.mode_id}
                </span>
              </div>
              <Link
                href="/founder/settings"
                className="text-[10px] text-accent hover:underline flex items-center gap-0.5"
              >
                Change <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Mode name + description */}
            <div>
              <p className={`text-[14px] font-semibold leading-snug ${mc.iconCls}`}>{activeMode.name}</p>
              <p className="text-[12px] text-fg-secondary mt-0.5">{activeMode.description}</p>
            </div>

            {/* Capabilities + Restrictions in 2-col on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide mb-1">Capabilities</p>
                {activeMode.capabilities.map((cap, i) => (
                  <p key={i} className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-severity-success text-[10px]">✓</span>
                    <span className="text-fg-secondary">{cap}</span>
                  </p>
                ))}
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide mb-1">Restrictions</p>
                {activeMode.restrictions.map((r, i) => (
                  <p key={i} className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-severity-critical text-[10px]">✗</span>
                    <span className="text-fg-muted">{r}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

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

      {/* ── P8: Governance Status ── */}
      {(() => {
        const { approval_required_count, blocked_count, violations, policies, evaluations } = governance
        const enabledPolicies  = policies.filter(p => p.enabled).length
        const disabledPolicies = policies.filter(p => !p.enabled).length
        const readOnlyMode     = evaluations.length > 0 && evaluations.every(e => e.governing_policy === 'policy_a')
        const hasIssues        = blocked_count > 0 || approval_required_count > 0

        if (policies.length === 0) return null

        return (
          <div className="rounded-xl border border-border-subtle bg-surface px-4 py-3 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="text-[11px] font-semibold text-fg-primary uppercase tracking-wide">Governance Status</span>
              </div>
              <Link
                href="/founder/approvals#governance"
                className="text-[10px] text-accent hover:underline"
              >
                View policies
              </Link>
            </div>

            {/* Status pills row */}
            <div className="flex flex-wrap gap-2">
              {/* Read-only mode pill */}
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                readOnlyMode
                  ? 'bg-severity-success/10 text-severity-success'
                  : 'bg-elevated text-fg-muted'
              }`}>
                <Eye className="h-3 w-3" />
                Read Only Mode: {readOnlyMode ? 'Active' : 'Off'}
              </span>

              {/* Approval required pill */}
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                approval_required_count > 0
                  ? 'bg-severity-warn/10 text-severity-warn'
                  : 'bg-elevated text-fg-muted'
              }`}>
                <Clock className="h-3 w-3" />
                Approval Required: {approval_required_count}
              </span>

              {/* Blocked pill */}
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                blocked_count > 0
                  ? 'bg-severity-critical/10 text-severity-critical'
                  : 'bg-elevated text-fg-muted'
              }`}>
                <Ban className="h-3 w-3" />
                Execution Blocked: {blocked_count}
              </span>

              {/* Policy violations */}
              {violations.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-severity-critical/10 px-2.5 py-1 text-[11px] font-medium text-severity-critical">
                  <AlertTriangle className="h-3 w-3" />
                  {violations.length} Policy Violation{violations.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Policy health row */}
            <div className="flex items-center gap-3 text-[11px] text-fg-muted">
              <span>{enabledPolicies} of {policies.length} policies active</span>
              {disabledPolicies > 0 && (
                <span className="text-severity-warn">{disabledPolicies} disabled</span>
              )}
              {!hasIssues && evaluations.length > 0 && (
                <span className="text-severity-success">All operations governed ✔</span>
              )}
            </div>

            {/* Top violation (if any) */}
            {violations.length > 0 && (
              <div className="rounded-lg bg-severity-critical/[0.04] border border-severity-critical/15 px-3 py-2">
                <p className="text-[11px] font-semibold text-severity-critical mb-0.5">Top Violation</p>
                <p className="text-[12px] text-fg-primary font-medium">{violations[0].operation_title}</p>
                <p className="text-[11px] text-fg-secondary mt-0.5">{violations[0].reason}</p>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── P10: Execution Authority panel ── */}
      {(() => {
        const total = authority.pending.length + authority.authorized.length +
                      authority.blocked.length + authority.expired.length + authority.revoked.length
        if (total === 0) return null
        return (
          <div className="rounded-xl border border-border-subtle bg-surface px-4 py-3 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Key className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="text-[11px] font-semibold text-fg-primary uppercase tracking-wide">Execution Authority</span>
              </div>
              <Link href="/founder/approvals#authority" className="text-[10px] text-accent hover:underline">
                Review
              </Link>
            </div>

            {/* Status counters — 4 pills */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                authority.authorized.length > 0 ? 'bg-severity-success/10 text-severity-success' : 'bg-elevated text-fg-muted'
              }`}>
                <CheckCircle2 className="h-3 w-3" />
                Authorized: {authority.authorized.length}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                authority.pending.length > 0 ? 'bg-severity-warn/10 text-severity-warn' : 'bg-elevated text-fg-muted'
              }`}>
                <Clock className="h-3 w-3" />
                Pending Approval: {authority.pending.length}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                authority.blocked.length > 0 ? 'bg-severity-critical/10 text-severity-critical' : 'bg-elevated text-fg-muted'
              }`}>
                <Ban className="h-3 w-3" />
                Blocked: {authority.blocked.length}
              </span>
              {(authority.expired.length > 0 || authority.revoked.length > 0) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2.5 py-1 text-[11px] font-medium text-fg-disabled">
                  <Clock className="h-3 w-3" />
                  Expired / Revoked: {authority.expired.length + authority.revoked.length}
                </span>
              )}
            </div>

            {/* Top pending item (if any) */}
            {authority.pending.length > 0 && (
              <div className="rounded-lg border border-severity-warn/20 bg-severity-warn/[0.03] px-3 py-2">
                <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide mb-0.5">Awaiting Approval</p>
                <p className="text-[12px] font-medium text-fg-primary">{authority.pending[0].operation_title}</p>
                <p className="text-[11px] text-fg-secondary mt-0.5">{authority.pending[0].reason}</p>
                {authority.pending.length > 1 && (
                  <p className="text-[10px] text-fg-disabled mt-1">+{authority.pending.length - 1} more pending</p>
                )}
              </div>
            )}

            {/* Top blocked item (if any) */}
            {authority.blocked.length > 0 && (
              <div className="rounded-lg border border-severity-critical/15 bg-severity-critical/[0.03] px-3 py-2">
                <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide mb-0.5">Blocked</p>
                <p className="text-[12px] font-medium text-fg-primary">{authority.blocked[0].operation_title}</p>
                <p className="text-[11px] text-fg-secondary mt-0.5">{authority.blocked[0].reason}</p>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── P11: Execution Readiness panel ── */}
      {(() => {
        const total = execution.queued.length + execution.eligible.length +
                      execution.executing.length + execution.completed.length +
                      execution.failed.length + execution.blocked.length
        if (total === 0) return null
        return (
          <div className="rounded-xl border border-border-subtle bg-surface px-4 py-3 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="text-[11px] font-semibold text-fg-primary uppercase tracking-wide">Execution Readiness</span>
              </div>
              <Link href="/founder/approvals#execution" className="text-[10px] text-accent hover:underline">
                Review
              </Link>
            </div>

            {/* 4 status pills */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                execution.eligible.length > 0 ? 'bg-severity-success/10 text-severity-success' : 'bg-elevated text-fg-muted'
              }`}>
                <CheckCircle2 className="h-3 w-3" />
                Eligible: {execution.eligible.length}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                execution.executing.length > 0 ? 'bg-severity-warn/10 text-severity-warn' : 'bg-elevated text-fg-muted'
              }`}>
                <Clock className="h-3 w-3" />
                Executing: {execution.executing.length}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                execution.completed.length > 0 ? 'bg-severity-success/10 text-severity-success' : 'bg-elevated text-fg-muted'
              }`}>
                <CheckCircle2 className="h-3 w-3" />
                Completed Today: {execution.completed.length}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                execution.blocked.length > 0 ? 'bg-severity-critical/10 text-severity-critical' : 'bg-elevated text-fg-muted'
              }`}>
                <Ban className="h-3 w-3" />
                Blocked: {execution.blocked.length}
              </span>
            </div>

            {/* Top eligible item */}
            {execution.eligible.length > 0 && (
              <div className="rounded-lg border border-severity-success/20 bg-severity-success/[0.03] px-3 py-2">
                <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide mb-0.5">Next Eligible</p>
                <p className="text-[12px] font-medium text-fg-primary">{execution.eligible[0].operation_title}</p>
                <p className="text-[11px] text-fg-secondary mt-0.5">{execution.eligible[0].execution_reason}</p>
                {execution.eligible.length > 1 && (
                  <p className="text-[10px] text-fg-disabled mt-1">+{execution.eligible.length - 1} more eligible</p>
                )}
              </div>
            )}

            {/* Top blocked item */}
            {execution.blocked.length > 0 && (
              <div className="rounded-lg border border-severity-critical/15 bg-severity-critical/[0.03] px-3 py-2">
                <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide mb-0.5">Blocked</p>
                <p className="text-[12px] font-medium text-fg-primary">{execution.blocked[0].operation_title}</p>
                <p className="text-[11px] text-fg-secondary mt-0.5">{execution.blocked[0].execution_reason}</p>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── P12: Learning Intelligence panel ── */}
      {learning.learning_count > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface px-4 py-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
              <span className="text-[11px] font-semibold text-fg-primary uppercase tracking-wide">Learning Intelligence</span>
            </div>
            <Link href="/founder/approvals#learning" className="text-[10px] text-accent hover:underline">
              Review
            </Link>
          </div>

          {/* 4 stat pills */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
              <Sparkles className="h-3 w-3" />
              {learning.learning_count} Learnings
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              learning.success_patterns.length > 0 ? 'bg-severity-success/10 text-severity-success' : 'bg-elevated text-fg-muted'
            }`}>
              <CheckCircle2 className="h-3 w-3" />
              {learning.success_patterns.length} Success Patterns
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              learning.failure_patterns.length > 0 ? 'bg-severity-critical/10 text-severity-critical' : 'bg-elevated text-fg-muted'
            }`}>
              <Ban className="h-3 w-3" />
              {learning.failure_patterns.length} Failure Patterns
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              learning.recommendation_quality >= 70 ? 'bg-severity-success/10 text-severity-success'
              : learning.recommendation_quality >= 40 ? 'bg-severity-warn/10 text-severity-warn'
              : 'bg-elevated text-fg-muted'
            }`}>
              Rec Quality: {learning.recommendation_quality}%
            </span>
          </div>

          {/* Top insight */}
          {learning.top_insights.length > 0 && (
            <div className="rounded-lg border border-accent/15 bg-accent/[0.03] px-3 py-2">
              <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide mb-0.5">Top Insight</p>
              <p className="text-[12px] text-fg-secondary leading-relaxed">{learning.top_insights[0]}</p>
              {learning.top_insights.length > 1 && (
                <p className="text-[10px] text-fg-disabled mt-1">+{learning.top_insights.length - 1} more insights</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── P13: Autonomy Status panel ── */}
      {autonomy && (() => {
        const statusMeta: Record<string, { ring: string; dot: string; label: string; badge: string }> = {
          ready:                { ring: 'border-severity-success/30', dot: 'bg-severity-success', label: 'Ready',               badge: 'bg-severity-success/10 text-severity-success' },
          waiting_for_founder:  { ring: 'border-severity-warn/30',    dot: 'bg-severity-warn',    label: 'Waiting for Founder',  badge: 'bg-severity-warn/10 text-severity-warn' },
          monitoring:           { ring: 'border-blue-400/30',          dot: 'bg-blue-400',         label: 'Monitoring',           badge: 'bg-blue-400/10 text-blue-400' },
          blocked:              { ring: 'border-severity-critical/30', dot: 'bg-severity-critical', label: 'Blocked',             badge: 'bg-severity-critical/10 text-severity-critical' },
          idle:                 { ring: 'border-border-subtle',        dot: 'bg-fg-disabled',      label: 'Idle',                 badge: 'bg-elevated text-fg-muted' },
        }
        const sm = statusMeta[autonomy.status] ?? statusMeta.idle
        return (
          <div className={`rounded-xl border ${sm.ring} bg-surface px-4 py-3 space-y-3`}>
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="text-[11px] font-semibold text-fg-primary uppercase tracking-wide">Autonomy Status</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${sm.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${sm.dot}`} />
                  {sm.label}
                </span>
              </div>
              <Link href="/founder/approvals#autonomy" className="text-[10px] text-accent hover:underline">
                Review
              </Link>
            </div>

            {/* Next Best Action */}
            {autonomy.next_best_action && (
              <div className="rounded-lg bg-elevated px-3 py-2">
                <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide mb-0.5">Next Best Action</p>
                <p className="text-[12px] font-medium text-fg-primary leading-snug">{autonomy.next_best_action}</p>
              </div>
            )}

            {/* 4-stat pill row */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                autonomy.pending_approvals.length > 0 ? 'bg-severity-warn/10 text-severity-warn' : 'bg-elevated text-fg-muted'
              }`}>
                <Clock className="h-3 w-3" />
                Pending Approvals: {autonomy.pending_approvals.length}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                autonomy.ready_operations.length > 0 ? 'bg-severity-success/10 text-severity-success' : 'bg-elevated text-fg-muted'
              }`}>
                <CheckCircle2 className="h-3 w-3" />
                Ready Operations: {autonomy.ready_operations.length}
              </span>
              {autonomy.high_risk_operations.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-severity-critical/10 px-2.5 py-1 text-[11px] font-medium text-severity-critical">
                  <AlertTriangle className="h-3 w-3" />
                  High Risk: {autonomy.high_risk_operations.length}
                </span>
              )}
              {autonomy.learning_signals.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
                  <BrainCircuit className="h-3 w-3" />
                  Signals: {autonomy.learning_signals.length}
                </span>
              )}
            </div>

            {/* Blocking reason */}
            {autonomy.blocking_reason && (
              <div className="rounded-lg border border-severity-warn/20 bg-severity-warn/[0.03] px-3 py-2">
                <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide mb-0.5">Blocking Reason</p>
                <p className="text-[11px] text-fg-secondary leading-relaxed">{autonomy.blocking_reason}</p>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── S2: State Health ── */}
      {stateHealth.records.length > 0 && (() => {
        const { summary, records } = stateHealth
        const hasCritical = summary.critical > 0
        const hasExpired  = summary.expired  > 0
        const topCritical = records.find(r => r.health_status === 'critical')
        const topExpired  = records.find(r => r.health_status === 'expired')

        return (
          <>
            {/* Critical banner */}
            {hasCritical && (
              <div className="rounded-xl border border-severity-critical/40 bg-severity-critical/[0.06] px-4 py-2.5 flex items-start gap-2">
                <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-severity-critical" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-severity-critical">Founder action required — state expiration approaching</p>
                  {topCritical && (
                    <p className="text-[11px] text-fg-secondary mt-0.5">
                      {topCritical.label}{topCritical.preview ? ` · ${topCritical.preview}` : ''} expires in {topCritical.hours_remaining.toFixed(1)}h
                    </p>
                  )}
                </div>
                <Link href="/founder/approvals#state" className="text-[10px] text-severity-critical hover:underline shrink-0 mt-0.5">Review</Link>
              </div>
            )}

            {/* State Health panel */}
            <div className="rounded-xl border border-border-subtle bg-surface px-4 py-3 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="text-[11px] font-semibold text-fg-primary uppercase tracking-wide">State Health</span>
                </div>
                <Link href="/founder/approvals#state" className="text-[10px] text-accent hover:underline">
                  Full review
                </Link>
              </div>

              {/* 4 status pills */}
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  summary.healthy > 0 ? 'bg-severity-success/10 text-severity-success' : 'bg-elevated text-fg-muted'
                }`}>
                  <CheckCircle2 className="h-3 w-3" />
                  Healthy: {summary.healthy}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  summary.warning > 0 ? 'bg-severity-warn/10 text-severity-warn' : 'bg-elevated text-fg-muted'
                }`}>
                  <AlertTriangle className="h-3 w-3" />
                  Warning: {summary.warning}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  summary.critical > 0 ? 'bg-severity-critical/10 text-severity-critical' : 'bg-elevated text-fg-muted'
                }`}>
                  <AlertOctagon className="h-3 w-3" />
                  Critical: {summary.critical}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  summary.expired > 0 ? 'bg-fg-disabled/10 text-fg-disabled' : 'bg-elevated text-fg-muted'
                }`}>
                  <Clock className="h-3 w-3" />
                  Expired: {summary.expired}
                </span>
              </div>

              {/* Top critical item */}
              {topCritical && (
                <div className="rounded-lg border border-severity-critical/20 bg-severity-critical/[0.03] px-3 py-2">
                  <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide mb-0.5">Critical — Expires soon</p>
                  <p className="text-[12px] font-medium text-fg-primary">{topCritical.label}{topCritical.preview ? ` · ${topCritical.preview}` : ''}</p>
                  <p className="text-[11px] text-fg-secondary mt-0.5">Expires in {topCritical.hours_remaining.toFixed(1)}h · Refresh immediately</p>
                </div>
              )}

              {/* Top expired item (if no critical) */}
              {!topCritical && topExpired && (
                <div className="rounded-lg border border-border-subtle bg-elevated px-3 py-2">
                  <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide mb-0.5">Expired</p>
                  <p className="text-[12px] font-medium text-fg-muted">{topExpired.label}{topExpired.preview ? ` · ${topExpired.preview}` : ''}</p>
                  <p className="text-[11px] text-fg-disabled mt-0.5">State lost — re-initialise required</p>
                </div>
              )}
            </div>
          </>
        )
      })()}

      {/* ── S3: Dispatch Queue ── */}
      {(() => {
        if (dispatch.records.length === 0 && dispatch.eligible === 0) return null
        return (
          <div className="rounded-xl border border-border-subtle bg-surface px-4 py-3 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Send className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="text-[11px] font-semibold text-fg-primary uppercase tracking-wide">Dispatch Queue</span>
              </div>
              <Link href="/founder/approvals#dispatch" className="text-[10px] text-accent hover:underline">
                Review →
              </Link>
            </div>

            {/* 4 status pills */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                dispatch.eligible > 0 ? 'bg-severity-success/10 text-severity-success' : 'bg-elevated text-fg-muted'
              }`}>
                <CheckCircle2 className="h-3 w-3" />
                Eligible: {dispatch.eligible}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                dispatch.queued > 0 ? 'bg-accent/10 text-accent' : 'bg-elevated text-fg-muted'
              }`}>
                <Clock className="h-3 w-3" />
                Queued: {dispatch.queued}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                dispatch.dispatched > 0 ? 'bg-severity-success/10 text-severity-success' : 'bg-elevated text-fg-muted'
              }`}>
                <Send className="h-3 w-3" />
                Dispatched: {dispatch.dispatched}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                dispatch.blocked > 0 ? 'bg-severity-critical/10 text-severity-critical' : 'bg-elevated text-fg-muted'
              }`}>
                <Ban className="h-3 w-3" />
                Blocked: {dispatch.blocked}
              </span>
            </div>

            {/* Top Candidate */}
            {dispatch.top_candidate && (
              <div className="rounded-lg border border-severity-success/20 bg-severity-success/[0.03] px-3 py-2.5 space-y-1">
                <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide">Top Candidate</p>
                <p className="text-[13px] font-semibold text-fg-primary leading-snug">
                  {dispatch.top_candidate.operation_title}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                  <span className="text-fg-muted">
                    Priority{' '}
                    <span className="text-fg-secondary font-medium tabular-nums">
                      {dispatch.top_candidate.priority_score}
                    </span>
                  </span>
                  <span className={`font-medium ${
                    dispatch.top_candidate.authority_status === 'authorized'
                      ? 'text-severity-success'
                      : 'text-severity-warn'
                  }`}>
                    Authority {dispatch.top_candidate.authority_status === 'authorized' ? 'Authorized' : dispatch.top_candidate.authority_status}
                  </span>
                  <span className={`font-medium ${
                    dispatch.top_candidate.governance_status === 'allowed'
                      ? 'text-severity-success'
                      : dispatch.top_candidate.governance_status === 'needs_approval'
                      ? 'text-severity-warn'
                      : 'text-severity-critical'
                  }`}>
                    Governance {dispatch.top_candidate.governance_status === 'allowed' ? 'Approved' : dispatch.top_candidate.governance_status === 'needs_approval' ? 'Needs Review' : 'Blocked'}
                  </span>
                  <span className="text-fg-disabled">
                    {dispatch.top_candidate.founder_mode}
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── S4: Activation Status ── */}
      {activation.records.length > 0 && (() => {
        const total = activation.pending + activation.activated + activation.executing +
                      activation.completed + activation.failed + activation.blocked
        if (total === 0) return null
        return (
          <div className="rounded-xl border border-border-subtle bg-surface px-4 py-3 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-3.5 w-3.5 text-severity-success shrink-0" />
                <span className="text-[11px] font-semibold text-fg-primary uppercase tracking-wide">Activation Status</span>
              </div>
              <Link href="/founder/approvals#activation" className="text-[10px] text-accent hover:underline">
                Review →
              </Link>
            </div>

            {/* 5 status pills */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                activation.pending > 0 ? 'bg-severity-warn/10 text-severity-warn' : 'bg-elevated text-fg-muted'
              }`}>
                <Clock className="h-3 w-3" />
                Pending: {activation.pending}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                activation.activated > 0 ? 'bg-severity-success/10 text-severity-success' : 'bg-elevated text-fg-muted'
              }`}>
                <Sparkles className="h-3 w-3" />
                Activated: {activation.activated}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                activation.executing > 0 ? 'bg-accent/10 text-accent' : 'bg-elevated text-fg-muted'
              }`}>
                <Activity className="h-3 w-3" />
                Executing: {activation.executing}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                activation.completed > 0 ? 'bg-severity-success/10 text-severity-success' : 'bg-elevated text-fg-muted'
              }`}>
                <CheckCircle2 className="h-3 w-3" />
                Completed: {activation.completed}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                activation.blocked > 0 ? 'bg-severity-critical/10 text-severity-critical' : 'bg-elevated text-fg-muted'
              }`}>
                <Ban className="h-3 w-3" />
                Blocked: {activation.blocked}
              </span>
            </div>

            {/* Top Active Operation */}
            {activation.top_active && (
              <div className="rounded-lg border border-severity-success/20 bg-severity-success/[0.03] px-3 py-2.5 space-y-1">
                <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide">Top Active Operation</p>
                <p className="text-[13px] font-semibold text-fg-primary leading-snug">
                  {activation.top_active.operation_title}
                </p>
                <p className="text-[12px] text-fg-secondary leading-relaxed">
                  {activation.top_active.activation_reason}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-fg-muted">
                  <span>Mode: <span className="text-fg-secondary font-medium">{activation.top_active.founder_mode}</span></span>
                  <span className={`font-medium ${
                    activation.top_active.activation_status === 'activated' || activation.top_active.activation_status === 'executing'
                      ? 'text-severity-success'
                      : activation.top_active.activation_status === 'pending'
                      ? 'text-severity-warn'
                      : 'text-severity-critical'
                  }`}>
                    {activation.top_active.activation_status.charAt(0).toUpperCase() + activation.top_active.activation_status.slice(1)}
                  </span>
                  <span className="text-fg-disabled tabular-nums">Priority {activation.top_active.priority_score}</span>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── S5: Execution Queue ── */}
      {queue.records.length > 0 && (() => {
        const total = queue.queued + queue.leased + queue.executing + queue.completed + queue.failed + queue.dead_letter
        if (total === 0) return null
        return (
          <div className="rounded-xl border border-border-subtle bg-surface px-4 py-3 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ListChecks className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="text-[11px] font-semibold text-fg-primary uppercase tracking-wide">Execution Queue</span>
              </div>
              <Link href="/founder/approvals#queue" className="text-[10px] text-accent hover:underline">
                Review →
              </Link>
            </div>

            {/* Pills */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                queue.queued > 0 ? 'bg-accent/10 text-accent' : 'bg-elevated text-fg-muted'
              }`}>
                <Clock className="h-3 w-3" />
                Queued: {queue.queued}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                queue.executing > 0 ? 'bg-severity-warn/10 text-severity-warn' : 'bg-elevated text-fg-muted'
              }`}>
                <Activity className="h-3 w-3" />
                Executing: {queue.executing}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                queue.completed > 0 ? 'bg-severity-success/10 text-severity-success' : 'bg-elevated text-fg-muted'
              }`}>
                <CheckCircle2 className="h-3 w-3" />
                Completed: {queue.completed}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                queue.dead_letter > 0 ? 'bg-severity-critical/10 text-severity-critical' : 'bg-elevated text-fg-muted'
              }`}>
                <AlertOctagon className="h-3 w-3" />
                Dead Letter: {queue.dead_letter}
              </span>
            </div>

            {/* Top Queue Item */}
            {queue.top_item && (
              <div className="rounded-lg border border-accent/20 bg-accent/[0.03] px-3 py-2.5 space-y-1">
                <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide">Top Queue Item</p>
                <p className="text-[13px] font-semibold text-fg-primary leading-snug">{queue.top_item.operation_title}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-fg-muted">
                  <span>Mode: <span className="font-medium text-fg-secondary">{queue.top_item.founder_mode}</span></span>
                  <span className="tabular-nums">
                    Retry: <span className="font-medium text-fg-secondary">{queue.top_item.retry_count}/{queue.top_item.max_retries}</span>
                  </span>
                  <span className={`font-medium ${
                    queue.top_item.queue_status === 'queued'   ? 'text-accent'
                    : queue.top_item.queue_status === 'leased'   ? 'text-severity-warn'
                    : queue.top_item.queue_status === 'completed' ? 'text-severity-success'
                    : queue.top_item.queue_status === 'dead_letter' ? 'text-severity-critical'
                    : 'text-fg-muted'
                  }`}>
                    {queue.top_item.queue_status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                  {queue.top_item.leased_by && (
                    <span className="text-fg-disabled">Leased by: {queue.top_item.leased_by}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Founder Roadmap ── */}
      {roadmap.total > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface px-4 py-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapIcon className="h-3.5 w-3.5 text-accent shrink-0" />
              <span className="text-[11px] font-semibold text-fg-primary uppercase tracking-wide">Founder Roadmap</span>
              <span className="inline-flex items-center rounded-full bg-elevated px-2 py-0.5 text-[10px] font-medium text-fg-muted">
                P1–P13 + S1–S5 completed
              </span>
            </div>
            <Link href="/founder/approvals#roadmap" className="text-[10px] text-accent hover:underline">
              Full map →
            </Link>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-fg-muted">Future Phases (P14–P20 · S6–S12)</span>
              <span className="tabular-nums font-semibold text-fg-primary">{roadmap.pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-elevated overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-700"
                style={{ width: `${roadmap.pct}%` }}
              />
            </div>
            <div className="flex gap-3 text-[10px] text-fg-disabled tabular-nums">
              <span>{roadmap.completed}/{roadmap.total} done</span>
              {roadmap.in_progress > 0 && <span className="text-accent">{roadmap.in_progress} in progress</span>}
              {roadmap.blocked > 0 && <span className="text-severity-critical">{roadmap.blocked} blocked</span>}
            </div>
          </div>

          {/* Current + Next phase */}
          {roadmap.current && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-accent/[0.04] border border-accent/15 px-3 py-2 space-y-0.5">
                <p className="text-[9px] font-semibold text-accent uppercase tracking-wide">Current</p>
                <p className="text-[12px] font-semibold text-fg-primary leading-snug">{roadmap.current.phase_id}</p>
                <p className="text-[11px] text-fg-muted leading-snug">{roadmap.current.title}</p>
              </div>
              {roadmap.next && (
                <div className="rounded-lg bg-elevated border border-border-subtle px-3 py-2 space-y-0.5">
                  <p className="text-[9px] font-semibold text-fg-disabled uppercase tracking-wide">Next</p>
                  <p className="text-[12px] font-semibold text-fg-secondary leading-snug">{roadmap.next.phase_id}</p>
                  <p className="text-[11px] text-fg-muted leading-snug">{roadmap.next.title}</p>
                </div>
              )}
            </div>
          )}

          {/* Blocked phases */}
          {roadmap.blocked_items.length > 0 && (
            <div className="rounded-lg bg-severity-critical/[0.04] border border-severity-critical/15 px-3 py-2">
              <p className="text-[9px] font-semibold text-severity-critical uppercase tracking-wide mb-1">Blocked</p>
              <div className="flex flex-wrap gap-1">
                {roadmap.blocked_items.map(b => (
                  <span key={b.roadmap_id} className="rounded-full bg-severity-critical/10 text-severity-critical text-[10px] font-medium px-2 py-0.5">
                    {b.phase_id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Strategic milestones */}
          {roadmap.milestones.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-semibold text-fg-disabled uppercase tracking-wide">Strategic Milestones</p>
              <div className="flex flex-wrap gap-1">
                {roadmap.milestones.map(m => (
                  <span
                    key={m.roadmap_id}
                    className={`rounded-full text-[10px] font-medium px-2 py-0.5 ${
                      m.status === 'completed'  ? 'bg-severity-success/10 text-severity-success'
                      : m.status === 'in_progress' ? 'bg-accent/10 text-accent'
                      : m.status === 'blocked'     ? 'bg-severity-critical/10 text-severity-critical'
                      : 'bg-elevated text-fg-muted'
                    }`}
                  >
                    {m.phase_id}: {m.title.length > 22 ? m.title.slice(0, 22) + '…' : m.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── S6: Execution Engine ── */}
      {executor.records.length > 0 && (() => {
        const total = executor.running + executor.completed + executor.failed + executor.unverified
        if (total === 0) return null
        return (
          <div className="rounded-xl border border-border-subtle bg-surface px-4 py-3 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-severity-success shrink-0" />
                <span className="text-[11px] font-semibold text-fg-primary uppercase tracking-wide">Execution Engine</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  executor.gateway_live
                    ? 'bg-severity-success/10 text-severity-success'
                    : 'bg-severity-critical/10 text-severity-critical'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    executor.gateway_live ? 'bg-severity-success' : 'bg-severity-critical'
                  }`} />
                  {executor.gateway_live ? 'Gateway Live' : 'Gateway Offline'}
                </span>
              </div>
              <Link href="/founder/approvals#executor" className="text-[10px] text-accent hover:underline">
                Review →
              </Link>
            </div>

            {/* Pills */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                executor.running > 0 ? 'bg-accent/10 text-accent' : 'bg-elevated text-fg-muted'
              }`}>
                <Activity className="h-3 w-3" />
                Running: {executor.running}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                executor.completed > 0 ? 'bg-severity-success/10 text-severity-success' : 'bg-elevated text-fg-muted'
              }`}>
                <CheckCircle2 className="h-3 w-3" />
                Completed: {executor.completed}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                executor.failed > 0 ? 'bg-severity-critical/10 text-severity-critical' : 'bg-elevated text-fg-muted'
              }`}>
                <AlertOctagon className="h-3 w-3" />
                Failed: {executor.failed}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                executor.unverified > 0 ? 'bg-severity-warn/10 text-severity-warn' : 'bg-elevated text-fg-muted'
              }`}>
                <Eye className="h-3 w-3" />
                Unverified: {executor.unverified}
              </span>
            </div>

            {/* Top Running Task */}
            {executor.top_running && (
              <div className="rounded-lg border border-accent/20 bg-accent/[0.03] px-3 py-2.5 space-y-1">
                <p className="text-[10px] font-semibold text-fg-disabled uppercase tracking-wide">Top Running Task</p>
                <p className="text-[13px] font-semibold text-fg-primary leading-snug">{executor.top_running.operation_title}</p>
                <p className="text-[12px] text-fg-secondary leading-relaxed">{executor.top_running.execution_reason}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-fg-muted">
                  <span>Mode: <span className="font-medium text-fg-secondary">{executor.top_running.founder_mode}</span></span>
                  <span className={`font-medium ${
                    executor.top_running.verification_status === 'verified'   ? 'text-severity-success'
                    : executor.top_running.verification_status === 'unverified' ? 'text-severity-warn'
                    : executor.top_running.verification_status === 'failed'     ? 'text-severity-critical'
                    : 'text-fg-muted'
                  }`}>
                    Verification: {executor.top_running.verification_status}
                  </span>
                  {executor.top_running.duration_ms !== null && (
                    <span className="text-fg-disabled tabular-nums">{executor.top_running.duration_ms}ms</span>
                  )}
                </div>
              </div>
            )}
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
