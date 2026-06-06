/**
 * app/api/founder/autonomy/route.ts
 * P13 — Autonomous Operating Loop
 *
 * Orchestration-only. Continuously evaluates the full Founder OS pipeline
 * and surfaces the next best action without triggering any execution.
 *
 * Sources:
 *   • Recommendations  (P5)  — /api/founder/recommendations
 *   • Operations       (P6)  — /api/founder/operations
 *   • Scheduler        (P7)  — /api/founder/scheduler
 *   • Governance       (P8)  — /api/founder/governance
 *   • Founder Modes    (P9)  — /api/founder/modes
 *   • Authority        (P10) — /api/founder/authority
 *   • Execution        (P11) — /api/founder/execution
 *   • Learning         (P12) — /api/founder/learning
 *
 * Storage  : execution_memory only — key p13:autonomy:latest
 * NO execution. NO GitHub / Supabase / Vercel / Doppler writes.
 */

import { NextRequest, NextResponse } from 'next/server'

// ────────────────────────────── Types

export type AutonomyStatus =
  | 'idle'
  | 'monitoring'
  | 'waiting_for_founder'
  | 'ready'
  | 'blocked'

export interface AutonomyRecord {
  loop_id:                  string
  cycle_id:                 string
  active_mode:              string
  recommendations_scanned:  number
  operations_scanned:       number
  authority_checked:        boolean
  execution_checked:        boolean
  learning_checked:         boolean
  next_best_action:         string
  autonomy_status:          AutonomyStatus
  reason:                   string
  created_at:               string
}

export interface AutonomyEngine {
  status:               AutonomyStatus
  next_best_action:     string
  blocking_reason:      string
  ready_operations:     OperationSummary[]
  pending_approvals:    ApprovalSummary[]
  high_risk_operations: OperationSummary[]
  learning_signals:     string[]
  record:               AutonomyRecord
  evaluated_at:         string
}

interface OperationSummary {
  operation_id:  string
  title:         string
  risk_score:    number
  priority:      number
  mode_id:       string
}

interface ApprovalSummary {
  operation_id: string
  title:        string
  reason:       string
  type:         'governance' | 'authority' | 'mode'
}

// ────────────────────────────── Helpers

function nowIso() { return new Date().toISOString() }
function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function appBase(): string {
  const b = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? ''
  return b.startsWith('http') ? b : `https://${b}`
}
async function fetchJson(path: string) {
  try {
    const res = await fetch(`${appBase()}${path}`, { cache: 'no-store' })
    return res.ok ? res.json() : null
  } catch { return null }
}

// ────────────────────────────── Execution Memory

const EM_BASE    = '/api/founder/execution-memory'
const EM_PROJECT = 'pranix'
const EM_KEY     = 'p13:autonomy:latest'

async function readFromMemory(): Promise<AutonomyRecord | null> {
  try {
    const j = await fetchJson(`${EM_BASE}?project=${EM_PROJECT}&key=${EM_KEY}`)
    return (j?.value as AutonomyRecord) ?? null
  } catch { return null }
}

async function writeToMemory(record: AutonomyRecord): Promise<void> {
  try {
    await fetch(`${appBase()}${EM_BASE}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project:   EM_PROJECT,
        key:       EM_KEY,
        value:     record,
        ttl_hours: 24,
      }),
    })
  } catch { /* non-fatal */ }
}

// ────────────────────────────── Loop Evaluation

type RawOp = { operation_id: string; title?: string; name?: string; risk_score?: number; priority_score?: number; mode_id?: string }
type RawEntry = { operation_id: string; title?: string; can_run_now?: boolean; risk_score?: number; priority_score?: number; tier?: string }
type RawGovEval = { operation_id: string; operation_title?: string; verdict?: string; reason?: string; policy_name?: string }
type RawAuthRec = { operation_id: string; operation_title?: string; authorization_status?: string; reason?: string }
type RawExecRec = { operation_id: string; operation_title?: string; execution_status?: string; mode_id?: string; risk_score?: number }
type RawLearning = { insight?: string; outcome?: string; confidence?: number }

interface EvalContext {
  mode:          string
  scheduleReady: RawEntry[]
  scheduleAll:   RawEntry[]
  govEvals:      RawGovEval[]
  authPending:   RawAuthRec[]
  authBlocked:   RawAuthRec[]
  execEligible:  RawExecRec[]
  execBlocked:   RawExecRec[]
  recCount:      number
  opCount:       number
  learnings:     RawLearning[]
}

function determineStatus(ctx: EvalContext): {
  status:           AutonomyStatus
  next_best_action: string
  reason:           string
  blocking_reason:  string
} {
  const {
    mode, scheduleReady, govEvals, authPending, authBlocked,
    execEligible, execBlocked, recCount, opCount,
  } = ctx

  const govBlocked      = govEvals.filter(e => e.verdict === 'blocked')
  const govNeedsApprove = govEvals.filter(e => e.verdict === 'needs_approval')
  const highRisk        = scheduleReady.filter(e => (e.risk_score ?? 0) >= 70 || e.tier === 'critical')
  const lowRisk         = scheduleReady.filter(e => (e.risk_score ?? 0) < 70 && e.tier !== 'critical')

  // ── MODE_A: always waiting for founder
  if (mode === 'MODE_A') {
    const has_any = recCount > 0 || opCount > 0
    return {
      status:           has_any ? 'waiting_for_founder' : 'idle',
      next_best_action: has_any
        ? `Review ${recCount} recommendation${recCount !== 1 ? 's' : ''} and ${opCount} operation${opCount !== 1 ? 's' : ''} in Approval Center`
        : 'No pending items. System is idle in read-only mode.',
      reason:           'MODE_A requires all actions to be Founder-approved.',
      blocking_reason:  'MODE_A policy: no autonomous action permitted.',
    }
  }

  // ── MODE_B: waiting if approvals exist, ready otherwise
  if (mode === 'MODE_B') {
    const approvalsPending = authPending.length + govNeedsApprove.length
    if (approvalsPending > 0) {
      return {
        status:           'waiting_for_founder',
        next_best_action: `Review ${approvalsPending} pending approval${approvalsPending !== 1 ? 's' : ''} in Approval Center`,
        reason:           `${approvalsPending} operation${approvalsPending !== 1 ? 's' : ''} require Founder approval before proceeding.`,
        blocking_reason:  `Pending: ${authPending.length} authority + ${govNeedsApprove.length} governance approval${govNeedsApprove.length !== 1 ? 's' : ''}.`,
      }
    }
    if (execEligible.length > 0) {
      return {
        status:           'ready',
        next_best_action: `${execEligible.length} operation${execEligible.length !== 1 ? 's are' : ' is'} eligible for execution. Awaiting Founder-confirmed execution trigger.`,
        reason:           'All approvals cleared. Execution eligibility confirmed.',
        blocking_reason:  '',
      }
    }
    return {
      status:           'monitoring',
      next_best_action: 'Monitoring for new operations. No pending approvals.',
      reason:           'MODE_B is monitoring. No eligible operations yet.',
      blocking_reason:  '',
    }
  }

  // ── MODE_C: ready for low-risk, waiting for high-risk
  if (mode === 'MODE_C') {
    if (highRisk.length > 0) {
      return {
        status:           'waiting_for_founder',
        next_best_action: `Review ${highRisk.length} high-risk operation${highRisk.length !== 1 ? 's' : ''} before proceeding`,
        reason:           `${highRisk.length} high-risk operation${highRisk.length !== 1 ? 's' : ''} detected. Founder approval required.`,
        blocking_reason:  `High-risk operations: ${highRisk.map(e => e.tier ?? 'critical').join(', ')}`,
      }
    }
    if (lowRisk.length > 0) {
      return {
        status:           'ready',
        next_best_action: `${lowRisk.length} low-risk operation${lowRisk.length !== 1 ? 's are' : ' is'} ready. Governance and authority cleared.`,
        reason:           'Low-risk operations cleared all gates. Ready for execution trigger.',
        blocking_reason:  '',
      }
    }
    return {
      status:           'monitoring',
      next_best_action: 'Monitoring. No schedulable operations currently ready.',
      reason:           'MODE_C monitoring — no ready operations.',
      blocking_reason:  '',
    }
  }

  // ── MODE_D: governance determines readiness
  if (govBlocked.length > 0 || authBlocked.length > 0 || execBlocked.length > 0) {
    const totalBlocked = govBlocked.length + authBlocked.length + execBlocked.length
    const firstBlocked = govBlocked[0] ?? authBlocked[0]
    return {
      status:           'blocked',
      next_best_action: `Resolve ${totalBlocked} blocked operation${totalBlocked !== 1 ? 's' : ''}. Review Governance and Authority panels.`,
      reason:           firstBlocked
        ? `"${firstBlocked.operation_title}" blocked: ${firstBlocked.reason ?? 'governance policy'}`
        : `${totalBlocked} operations blocked by governance or authority.`,
      blocking_reason:  `Governance: ${govBlocked.length} blocked, Authority: ${authBlocked.length} blocked, Execution: ${execBlocked.length} blocked.`,
    }
  }

  if (govNeedsApprove.length > 0 || authPending.length > 0) {
    const total = govNeedsApprove.length + authPending.length
    return {
      status:           'waiting_for_founder',
      next_best_action: `${total} operation${total !== 1 ? 's' : ''} await Founder decision in Approval Center`,
      reason:           `Governance requires approval for ${govNeedsApprove.length} operations. Authority pending for ${authPending.length}.`,
      blocking_reason:  `Approval needed: ${govNeedsApprove.map(e => e.policy_name ?? 'policy').slice(0, 3).join(', ')}`,
    }
  }

  if (execEligible.length > 0) {
    return {
      status:           'ready',
      next_best_action: `${execEligible.length} operation${execEligible.length !== 1 ? 's are' : ' is'} fully authorized and eligible for execution.`,
      reason:           'All gates cleared: Governance ✓  Authority ✓  Execution ✓',
      blocking_reason:  '',
    }
  }

  if (scheduleReady.length > 0) {
    return {
      status:           'monitoring',
      next_best_action: `${scheduleReady.length} operation${scheduleReady.length !== 1 ? 's' : ''} scheduled and waiting for governance / authority clearance.`,
      reason:           'Operations are scheduled but have not cleared all governance gates yet.',
      blocking_reason:  '',
    }
  }

  if (recCount > 0) {
    return {
      status:           'monitoring',
      next_best_action: `${recCount} pending recommendation${recCount !== 1 ? 's' : ''}. Approve to create operations.`,
      reason:           'System has recommendations but no active operations yet.',
      blocking_reason:  '',
    }
  }

  return {
    status:           'idle',
    next_best_action: 'System is fully idle. No pending recommendations or operations.',
    reason:           'All queues empty across all governance layers.',
    blocking_reason:  '',
  }
}

// ────────────────────────────── GET /api/founder/autonomy

export async function GET() {
  const [recData, opData, schedData, govData, modesData, authData, execData, learnData] =
    await Promise.all([
      fetchJson('/api/founder/recommendations'),
      fetchJson('/api/founder/operations'),
      fetchJson('/api/founder/scheduler'),
      fetchJson('/api/founder/governance'),
      fetchJson('/api/founder/modes'),
      fetchJson('/api/founder/authority'),
      fetchJson('/api/founder/execution'),
      fetchJson('/api/founder/learning'),
    ])

  // Resolve active mode
  const activeMode: string = modesData?.active_mode ?? modesData?.current_mode ?? 'MODE_A'

  // Build context
  const scheduleReady = (schedData?.ready_now ?? []) as RawEntry[]
  const scheduleAll   = [...scheduleReady, ...(schedData?.blocked ?? [])] as RawEntry[]

  const govEvals    = (govData?.evaluations ?? [])         as RawGovEval[]
  const authPending = (authData?.pending    ?? [])         as RawAuthRec[]
  const authBlocked = [...(authData?.blocked ?? []), ...(authData?.revoked ?? [])] as RawAuthRec[]

  const execEligible = (execData?.eligible  ?? [])         as RawExecRec[]
  const execBlocked  = (execData?.blocked   ?? [])         as RawExecRec[]

  const recCount  = (recData?.recommendations ?? []).filter((r: { status?: string }) => r.status === 'pending').length
  const opCount   = [
    ...(opData?.queued    ?? []),
    ...(opData?.ready     ?? []),
    ...(opData?.executing ?? []),
  ].length

  const learnings = (learnData?.records ?? []) as RawLearning[]

  const ctx: EvalContext = {
    mode: activeMode,
    scheduleReady, scheduleAll,
    govEvals, authPending, authBlocked,
    execEligible, execBlocked,
    recCount, opCount,
    learnings,
  }

  const { status, next_best_action, reason, blocking_reason } = determineStatus(ctx)

  // Build rich output objects
  const ready_operations: OperationSummary[] = execEligible.map(e => ({
    operation_id: e.operation_id,
    title:        e.operation_title ?? e.operation_id,
    risk_score:   e.risk_score   ?? 0,
    priority:     0,
    mode_id:      e.mode_id      ?? activeMode,
  }))

  const pending_approvals: ApprovalSummary[] = [
    ...authPending.map(r => ({
      operation_id: r.operation_id,
      title:        r.operation_title ?? r.operation_id,
      reason:       r.reason          ?? 'Awaiting authority decision',
      type:         'authority' as const,
    })),
    ...govEvals.filter(e => e.verdict === 'needs_approval').map(e => ({
      operation_id: e.operation_id,
      title:        e.operation_title ?? e.operation_id,
      reason:       e.reason          ?? e.policy_name ?? 'Governance approval required',
      type:         'governance' as const,
    })),
  ]

  const high_risk_operations: OperationSummary[] = scheduleAll
    .filter(e => (e.risk_score ?? 0) >= 70 || e.tier === 'critical')
    .map(e => ({
      operation_id: e.operation_id,
      title:        e.title ?? e.operation_id,
      risk_score:   e.risk_score   ?? 70,
      priority:     e.priority_score ?? 0,
      mode_id:      activeMode,
    }))

  const learning_signals: string[] = learnings
    .filter(l => l.outcome === 'failure' || l.outcome === 'blocked')
    .slice(0, 3)
    .map(l => l.insight ?? '')
    .filter(Boolean)

  // Build and persist the autonomy record
  const record: AutonomyRecord = {
    loop_id:                  uid('loop'),
    cycle_id:                 uid('cyc'),
    active_mode:              activeMode,
    recommendations_scanned:  (recData?.recommendations ?? []).length,
    operations_scanned:       opCount,
    authority_checked:        authData != null,
    execution_checked:        execData != null,
    learning_checked:         learnData != null,
    next_best_action,
    autonomy_status:          status,
    reason,
    created_at:               nowIso(),
  }
  await writeToMemory(record)

  return NextResponse.json({
    status,
    next_best_action,
    blocking_reason,
    ready_operations,
    pending_approvals,
    high_risk_operations,
    learning_signals,
    record,
    evaluated_at: record.created_at,
  } as AutonomyEngine)
}

// ────────────────────────────── POST /api/founder/autonomy (read latest from memory)
// Founder can force a re-evaluation cycle

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (body?.action === 'read_latest') {
    const latest = await readFromMemory()
    return NextResponse.json({ latest })
  }
  // Default: trigger a fresh GET evaluation via internal redirect
  const fresh = await GET()
  return fresh
}
