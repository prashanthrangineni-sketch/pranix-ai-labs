// app/api/founder/autonomy/route.ts
// P13 — Autonomous Operating Loop
// Evaluates the full Founder OS stack and determines next action readiness.
// Read-only orchestration: no GitHub / Supabase / Vercel / Doppler writes.
// All state persisted to execution_memory under p13:autonomy:latest

import { NextResponse }  from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Execution-memory helpers ──────────────────────────────────────────────────
const sb = () =>
  createClient(
    process.env.PRANIX_SUPABASE_URL!,
    process.env.PRANIX_SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } },
  )

async function memRead(key: string): Promise<unknown> {
  const { data } = await sb()
    .from('execution_memory')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  return data?.value ?? null
}

async function memWrite(key: string, value: object, ttl_hours = 24): Promise<void> {
  const expires_at = new Date(Date.now() + ttl_hours * 3_600_000).toISOString()
  await sb()
    .from('execution_memory')
    .upsert({ key, value, expires_at, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}

// ── Types ────────────────────────────────────────────────────────────────────
export type AutonomyStatus =
  | 'idle'
  | 'monitoring'
  | 'waiting_for_founder'
  | 'ready'
  | 'blocked'

export interface AutonomyRecord {
  loop_id:                 string
  cycle_id:                string
  active_mode:             string
  recommendations_scanned: number
  operations_scanned:      number
  authority_checked:       boolean
  execution_checked:       boolean
  learning_checked:        boolean
  next_best_action:        string
  autonomy_status:         AutonomyStatus
  reason:                  string
  created_at:              string
}

export interface AutonomyEngine {
  status:               AutonomyStatus
  next_best_action:     string
  blocking_reason:      string
  ready_operations:     string[]
  pending_approvals:    string[]
  high_risk_operations: string[]
  learning_signals:     string[]
  active_mode:          string
  cycle_id:             string
  generated_at:         string
  record:               AutonomyRecord
}

// ── Internal fetch helpers (call own API routes) ─────────────────────────────
function base(): string {
  const b = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? ''
  return b.startsWith('http') ? b : `https://${b}`
}

async function safeJson(path: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`${base()}${path}`, { cache: 'no-store' })
    if (!res.ok) return {}
    return await res.json()
  } catch { return {} }
}

// ── Mode determination ────────────────────────────────────────────────────────
function resolveStatus(
  modeId:             string,
  pendingApprovals:   string[],
  readyOps:           string[],
  highRiskOps:        string[],
  blockedCount:       number,
): { status: AutonomyStatus; reason: string } {
  switch (modeId) {
    case 'MODE_A':
      return {
        status: 'waiting_for_founder',
        reason: 'MODE_A (Observe Only) — all actions require Founder approval before execution.',
      }

    case 'MODE_B':
      if (pendingApprovals.length > 0) {
        return {
          status: 'waiting_for_founder',
          reason: `MODE_B — ${pendingApprovals.length} operation${pendingApprovals.length > 1 ? 's' : ''} require Founder approval before proceeding.`,
        }
      }
      if (readyOps.length > 0) {
        return {
          status: 'ready',
          reason: `MODE_B — ${readyOps.length} operation${readyOps.length > 1 ? 's are' : ' is'} approved and ready. No approvals pending.`,
        }
      }
      return { status: 'monitoring', reason: 'MODE_B — No operations queued. Monitoring for new work.' }

    case 'MODE_C':
      if (blockedCount > 0) {
        return {
          status: 'blocked',
          reason: `MODE_C — ${blockedCount} operation${blockedCount > 1 ? 's' : ''} blocked by governance or authority layer.`,
        }
      }
      if (highRiskOps.length > 0) {
        return {
          status: 'waiting_for_founder',
          reason: `MODE_C — ${highRiskOps.length} high-risk operation${highRiskOps.length > 1 ? 's' : ''} detected. Founder review required.`,
        }
      }
      if (readyOps.length > 0) {
        return {
          status: 'ready',
          reason: `MODE_C — ${readyOps.length} low-risk operation${readyOps.length > 1 ? 's are' : ' is'} ready for autonomous execution.`,
        }
      }
      return { status: 'monitoring', reason: 'MODE_C — No low-risk operations queued. Monitoring.' }

    case 'MODE_D': {
      if (blockedCount > 0) {
        return {
          status: 'blocked',
          reason: `MODE_D — Governance layer has blocked ${blockedCount} operation${blockedCount > 1 ? 's' : ''}. No execution until resolved.`,
        }
      }
      if (pendingApprovals.length > 0) {
        return {
          status: 'waiting_for_founder',
          reason: `MODE_D — Governance requires Founder sign-off on ${pendingApprovals.length} operation${pendingApprovals.length > 1 ? 's' : ''}.`,
        }
      }
      if (readyOps.length > 0) {
        return {
          status: 'ready',
          reason: `MODE_D — Governance cleared ${readyOps.length} operation${readyOps.length > 1 ? 's' : ''} for execution.`,
        }
      }
      return { status: 'monitoring', reason: 'MODE_D — All operations governed. System monitoring for new work.' }
    }

    default:
      return { status: 'idle', reason: 'No active Founder Mode detected. System is idle.' }
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    // 1. Fetch all upstream layers in parallel
    const [
      modesJ,
      opsJ,
      govJ,
      authorityJ,
      executionJ,
      learningJ,
      schedulerJ,
    ] = await Promise.all([
      safeJson('/api/founder/modes'),
      safeJson('/api/founder/operations'),
      safeJson('/api/founder/governance'),
      safeJson('/api/founder/authority'),
      safeJson('/api/founder/execution'),
      safeJson('/api/founder/learning'),
      safeJson('/api/founder/scheduler'),
    ])

    // 2. Extract key signals
    const activeMode: string = (modesJ.active_mode as { mode_id?: string } | null)?.mode_id ?? 'MODE_A'

    const allOps = [
      ...((opsJ.ready     as unknown[]) ?? []),
      ...((opsJ.executing as unknown[]) ?? []),
      ...((opsJ.queued    as unknown[]) ?? []),
      ...((opsJ.blocked   as unknown[]) ?? []),
    ] as Array<{ operation_id: string; title: string; risk_level?: string; status: string }>

    const operationsScanned = allOps.length
    const recsScanned       = ((govJ.evaluations as unknown[]) ?? []).length

    // High-risk: risk_level is 'high' or 'critical'
    const HIGH_RISK_LEVELS = new Set(['high', 'critical'])
    const highRiskOps = allOps
      .filter(o => HIGH_RISK_LEVELS.has(o.risk_level ?? ''))
      .map(o => o.title)

    // Ready operations: status = ready and governance = allowed
    const govMap = new Map<string, string>(
      ((govJ.evaluations as Array<{ operation_id: string; verdict: string }>) ?? []).map(
        e => [e.operation_id, e.verdict],
      ),
    )
    const readyOps = allOps
      .filter(o => {
        if (o.status !== 'ready') return false
        const verdict = govMap.get(o.operation_id) ?? 'allowed'
        return verdict === 'allowed'
      })
      .map(o => o.title)

    // Pending approvals: governance needs_approval OR authority pending
    const govPendingOps = allOps
      .filter(o => govMap.get(o.operation_id) === 'needs_approval')
      .map(o => o.title)
    const authPendingOps = (
      (authorityJ.pending as Array<{ operation_title: string }>) ?? []
    ).map(r => r.operation_title)
    const pendingApprovals = [...new Set([...govPendingOps, ...authPendingOps])]

    const blockedCount: number =
      ((govJ.blocked_count as number) ?? 0) +
      ((authorityJ.blocked as unknown[]) ?? []).length

    // Learning signals
    const learningSignals: string[] = [
      ...((learningJ.top_insights as string[]) ?? []).slice(0, 3),
      ...((learningJ.success_patterns as string[]) ?? []).slice(0, 2),
    ]

    // 3. Determine autonomy status
    const { status, reason } = resolveStatus(
      activeMode,
      pendingApprovals,
      readyOps,
      highRiskOps,
      blockedCount,
    )

    // 4. Determine Next Best Action
    const schedulerNBA = (schedulerJ.next_best_action as { title?: string } | null)?.title ?? ''
    let nextBestAction = schedulerNBA
    if (!nextBestAction) {
      if (pendingApprovals.length > 0) nextBestAction = `Review and approve: ${pendingApprovals[0]}`
      else if (readyOps.length > 0)    nextBestAction = `Eligible for execution: ${readyOps[0]}`
      else                              nextBestAction = 'Monitor system — no actions queued'
    }

    const blockingReason = status === 'blocked' || status === 'waiting_for_founder' ? reason : ''

    // 5. Build record
    const now      = new Date().toISOString()
    const cycleId  = `cycle_${Date.now()}`
    const loopId   = 'p13_main'

    const record: AutonomyRecord = {
      loop_id:                 loopId,
      cycle_id:                cycleId,
      active_mode:             activeMode,
      recommendations_scanned: recsScanned,
      operations_scanned:      operationsScanned,
      authority_checked:       Object.keys(authorityJ).length > 0,
      execution_checked:       Object.keys(executionJ).length > 0,
      learning_checked:        Object.keys(learningJ).length > 0,
      next_best_action:        nextBestAction,
      autonomy_status:         status,
      reason,
      created_at:              now,
    }

    const engine: AutonomyEngine = {
      status,
      next_best_action:     nextBestAction,
      blocking_reason:      blockingReason,
      ready_operations:     readyOps,
      pending_approvals:    pendingApprovals,
      high_risk_operations: highRiskOps,
      learning_signals:     learningSignals,
      active_mode:          activeMode,
      cycle_id:             cycleId,
      generated_at:         now,
      record,
    }

    // 6. Persist to execution_memory
    await memWrite('p13:autonomy:latest', engine as unknown as object)

    return NextResponse.json(engine)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Autonomy evaluation failed'
    console.error('[P13 autonomy GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
// Accepted but no-op — P13 does not trigger execution.
// Execution remains governed by Authority (P10), Governance (P8),
// Founder Modes (P9), and Execution Readiness (P11).
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = (body as { action?: string }).action ?? ''

    // Only allowed action is a manual cycle refresh
    if (action === 'refresh_cycle') {
      // Trigger a fresh GET evaluation cycle internally
      return GET()
    }

    return NextResponse.json(
      { ok: false, error: 'P13 is read-only orchestration. No execution actions allowed.' },
      { status: 403 },
    )
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
  }
}
