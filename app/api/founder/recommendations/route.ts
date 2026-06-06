// app/api/founder/recommendations/route.ts
// P5 — Autonomous Recommendation Engine.
// Scans execution_memory + orchestration_providers and auto-generates
// Recommendation objects ranked by severity.
// GET  — returns current recommendations (generated + any persisted statuses)
// POST — approve/dismiss a recommendation (persists status into execution_memory)
// No new DB tables. Only writes to execution_memory key 'p5:rec_status'.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@/lib/supabase'
import { getControlPlane }          from '@/app/lib/control-plane'
import type { PersistedTask }        from '@/app/founder/ask/ask-chat'

export const runtime    = 'nodejs'
export const dynamic    = 'force-dynamic'
export const revalidate = 0

const PROJECT = 'pranix-dashboard'
const TASK_NS = 'ask:task:'
const REC_STATUS_KEY = 'p5:rec_status'

// ── Types ───────────────────────────────────────────────────────────────
export type RiskLevel  = 'low' | 'medium' | 'high' | 'critical'
export type RecStatus  = 'pending' | 'approved' | 'dismissed'
export type RecCategory =
  | 'monitoring' | 'deployment' | 'infrastructure' | 'security'
  | 'provider'   | 'workflow'   | 'cost'           | 'founder'

export interface Recommendation {
  recommendation_id: string
  category:          RecCategory
  title:             string
  summary:           string
  evidence:          { source: string; detail: string; task_id?: string; hash_status?: string; confidence?: string }
  risk_level:        RiskLevel
  confidence:        number          // 0-100
  recommended_action: string
  source_task_id:    string | null
  status:            RecStatus
  generated_at:      string
}

// ── Auth ───────────────────────────────────────────────────────────────────
async function assertFounder(): Promise<boolean> {
  try {
    const supa = createServerClient()
    const { data: { user } } = await supa.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!email) return false
    const { data } = await getControlPlane()
      .from('dashboard_founders').select('email').eq('email', email).maybeSingle()
    return !!data
  } catch { return false }
}

// ── Severity rank for sorting ───────────────────────────────────────────────
const RISK_RANK: Record<RiskLevel, number> = { critical: 4, high: 3, medium: 2, low: 1 }

// ── Deterministic ID ───────────────────────────────────────────────────────────
function makeId(seed: string): string {
  // Simple 8-char deterministic id — stable for same seed across refreshes
  let h = 5381
  for (let i = 0; i < seed.length; i++) h = (h * 33) ^ seed.charCodeAt(i)
  return `rec_${(h >>> 0).toString(16).padStart(8, '0')}`
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET() {
  if (!await assertFounder())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cp  = getControlPlane()
  const now = new Date()

  // 1. Load tasks
  const { data: taskRows } = await cp
    .from('execution_memory')
    .select('key, value, created_at')
    .eq('project', PROJECT)
    .like('key', `${TASK_NS}%`)
    .gt('expires_at', now.toISOString())
    .order('created_at', { ascending: false })
    .limit(100)

  const tasks: PersistedTask[] = (taskRows ?? []).map(r => ({
    ...(r.value as PersistedTask),
    task_id: (r.value as PersistedTask).task_id ||
      (r.key as string).replace(TASK_NS, ''),
  }))

  // 2. Load provider health
  const { data: provRows } = await cp
    .from('orchestration_providers')
    .select('provider_name, health_status, updated_at')
    .order('provider_name')
    .limit(20)
  const providers = provRows ?? []

  // 3. Load persisted statuses (approve/dismiss decisions)
  const { data: statusRow } = await cp
    .from('execution_memory')
    .select('value')
    .eq('project', PROJECT)
    .eq('key', REC_STATUS_KEY)
    .maybeSingle()
  const savedStatuses: Record<string, RecStatus> =
    (statusRow?.value as Record<string, RecStatus>) ?? {}

  // ── Detection rules ───────────────────────────────────────────────────
  const recs: Recommendation[] = []
  const ts = now.toISOString()

  // Rule 1: provider offline or missing key
  for (const p of providers) {
    const isMissing  = p.health_status === 'disabled_billing_required'
    const isOffline  = p.health_status === 'offline'
    if (!isMissing && !isOffline) continue
    const id = makeId(`provider:${p.provider_name}:${p.health_status}`)
    recs.push({
      recommendation_id: id,
      category:    'provider',
      title:       isMissing
        ? `Add ${p.provider_name} API key`
        : `${p.provider_name} is offline`,
      summary:     isMissing
        ? `${p.provider_name} is configured but has no valid API key. Tasks requiring this provider will fail.`
        : `${p.provider_name} is reporting offline. Inference routing will skip it until it recovers.`,
      evidence:    { source: 'orchestration_providers', detail: `health_status = ${p.health_status}` },
      risk_level:  isMissing ? 'medium' : 'high',
      confidence:  95,
      recommended_action: isMissing
        ? `Set the API key for ${p.provider_name} in Doppler or environment config.`
        : `Check ${p.provider_name} status page and rotate credentials if needed.`,
      source_task_id: null,
      status:      savedStatuses[id] ?? 'pending',
      generated_at: ts,
    })
  }

  // Rule 2: task failures
  const failed = tasks.filter(t => t.status === 'failed')
  if (failed.length >= 2) {
    const id = makeId(`failures:count:${failed.length}`)
    recs.push({
      recommendation_id: id,
      category:    'workflow',
      title:       `${failed.length} agent tasks have failed`,
      summary:     `${failed.length} tasks ended in failure state. Review execution logs to identify root cause patterns.`,
      evidence:    {
        source:    'execution_memory',
        detail:    `${failed.length} tasks with status=failed`,
        task_id:   failed[0]?.task_id,
      },
      risk_level:  failed.length >= 5 ? 'high' : 'medium',
      confidence:  90,
      recommended_action: 'Open Approval Center → Task History and review each failed task’s replay.',
      source_task_id: failed[0]?.task_id ?? null,
      status:      savedStatuses[id] ?? 'pending',
      generated_at: ts,
    })
  }

  // Rule 3: founder decision = blocked_missing_data or investigate_further
  const blockedTasks = tasks.filter(t => {
    const d = t.analysis?.decision
    return d === 'blocked_missing_data' || d === 'investigate_further'
  })
  for (const t of blockedTasks.slice(0, 3)) {
    const id = makeId(`blocked:${t.task_id}`)
    recs.push({
      recommendation_id: id,
      category:    'founder',
      title:       `Task blocked: ${t.title ?? t.goal ?? 'Agent task'}`,
      summary:     `AI analysis flagged this task as "${t.analysis?.decision}". Founder input required to unblock.`,
      evidence:    {
        source:     'execution_memory',
        detail:     `decision=${t.analysis?.decision}, reasoning=${(t.analysis?.reasoning ?? '').slice(0, 80)}`,
        task_id:    t.task_id,
        confidence: `${t.analysis?.confidence ?? '?'}%`,
      },
      risk_level:   'high',
      confidence:   85,
      recommended_action: 'Review the task replay evidence and re-run with additional context.',
      source_task_id: t.task_id,
      status:       savedStatuses[id] ?? 'pending',
      generated_at: ts,
    })
  }

  // Rule 4: stale pending approval > 3 days
  const staleApprovals = tasks.filter(t => {
    if (t.status !== 'planned') return false
    if (!t.created_at) return false
    const ageMs = now.getTime() - new Date(t.created_at).getTime()
    return ageMs > 3 * 24 * 3600 * 1000
  })
  if (staleApprovals.length > 0) {
    const id = makeId(`stale_approvals:${staleApprovals.length}`)
    recs.push({
      recommendation_id: id,
      category:    'workflow',
      title:       `${staleApprovals.length} approval${staleApprovals.length > 1 ? 's' : ''} pending > 3 days`,
      summary:     `${staleApprovals.length} task plan${staleApprovals.length > 1 ? 's have' : ' has'} been waiting for founder approval for over 3 days.`,
      evidence:    {
        source:  'execution_memory',
        detail:  `${staleApprovals.length} tasks with status=planned older than 3 days`,
        task_id: staleApprovals[0]?.task_id,
      },
      risk_level:  'medium',
      confidence:  99,
      recommended_action: 'Open Approval Center and approve or reject each pending plan.',
      source_task_id: staleApprovals[0]?.task_id ?? null,
      status:      savedStatuses[id] ?? 'pending',
      generated_at: ts,
    })
  }

  // Rule 5: stale tasks > 7 days with no update
  const staleTasks = tasks.filter(t => {
    if (!t.created_at) return false
    const ageMs = now.getTime() - new Date(t.created_at).getTime()
    return ageMs > 7 * 24 * 3600 * 1000 &&
           t.status !== 'completed' && t.status !== 'failed'
  })
  if (staleTasks.length > 0) {
    const id = makeId(`stale_tasks:${staleTasks.length}`)
    recs.push({
      recommendation_id: id,
      category:    'workflow',
      title:       `${staleTasks.length} task${staleTasks.length > 1 ? 's' : ''} stale for > 7 days`,
      summary:     `${staleTasks.length} task${staleTasks.length > 1 ? 's are' : ' is'} still open but have not been updated in over 7 days. They may need to be cancelled or resumed.`,
      evidence:    {
        source:  'execution_memory',
        detail:  `${staleTasks.length} non-terminal tasks older than 7 days`,
        task_id: staleTasks[0]?.task_id,
      },
      risk_level:  'low',
      confidence:  95,
      recommended_action: 'Review stale tasks in the Approval Center and cancel or restart them.',
      source_task_id: staleTasks[0]?.task_id ?? null,
      status:      savedStatuses[id] ?? 'pending',
      generated_at: ts,
    })
  }

  // Rule 6: replay integrity failure
  const integrityIssues = tasks.filter(t =>
    t.verification?.integrity_status &&
    t.verification.integrity_status !== 'verified'
  )
  for (const t of integrityIssues.slice(0, 2)) {
    const id = makeId(`integrity:${t.task_id}`)
    recs.push({
      recommendation_id: id,
      category:    'security',
      title:       `Replay integrity issue: ${t.title ?? 'Agent task'}`,
      summary:     `Task evidence replay has integrity_status = "${
        (t.verification as { integrity_status: string }).integrity_status
      }". Evidence may be incomplete or tampered.`,
      evidence:    {
        source:      'execution_memory',
        detail:      `integrity_status=${(t.verification as { integrity_status: string }).integrity_status}`,
        task_id:     t.task_id,
        hash_status: (t.verification as { integrity_status: string }).integrity_status,
      },
      risk_level:  'high',
      confidence:  80,
      recommended_action: 'View replay for this task and re-run if evidence is incomplete.',
      source_task_id: t.task_id,
      status:      savedStatuses[id] ?? 'pending',
      generated_at: ts,
    })
  }

  // Rule 7: no tasks completed in > 7 days (monitoring gap)
  const hasRecentActivity = tasks.some(t => {
    if (!t.updated_at) return false
    return now.getTime() - new Date(t.updated_at).getTime() < 7 * 24 * 3600 * 1000
  })
  if (tasks.length > 0 && !hasRecentActivity) {
    const id = makeId('monitoring:no_recent_activity')
    recs.push({
      recommendation_id: id,
      category:    'monitoring',
      title:       'No agent activity in 7 days',
      summary:     'No tasks have been run or updated in the last 7 days. Automated monitoring may have stopped.',
      evidence:    { source: 'execution_memory', detail: 'No tasks updated in last 7 days' },
      risk_level:  'medium',
      confidence:  85,
      recommended_action: 'Run a health-check task from the Ask interface to verify agent pipeline is healthy.',
      source_task_id: null,
      status:      savedStatuses[id] ?? 'pending',
      generated_at: ts,
    })
  }

  // Sort: pending first, then by severity desc
  recs.sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === 'pending') return -1
      if (b.status === 'pending') return 1
    }
    return RISK_RANK[b.risk_level] - RISK_RANK[a.risk_level]
  })

  return NextResponse.json({
    recommendations: recs,
    total:           recs.length,
    pending:         recs.filter(r => r.status === 'pending').length,
    generated_at:    ts,
  })
}

// ── POST (approve / dismiss) ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!await assertFounder())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { recommendation_id, action } = body ?? {}
  if (!recommendation_id || !['approved', 'dismissed'].includes(action))
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const cp  = getControlPlane()
  const TTL = 168 * 3_600_000   // 7 days

  // Read existing statuses
  const { data: existing } = await cp
    .from('execution_memory')
    .select('value')
    .eq('project', PROJECT)
    .eq('key', REC_STATUS_KEY)
    .maybeSingle()

  const current: Record<string, RecStatus> = (existing?.value as Record<string, RecStatus>) ?? {}
  const updated = { ...current, [recommendation_id]: action as RecStatus }

  await cp
    .from('execution_memory')
    .upsert(
      { project: PROJECT, key: REC_STATUS_KEY, value: updated,
        expires_at: new Date(Date.now() + TTL).toISOString() },
      { onConflict: 'project,key', ignoreDuplicates: false },
    )

  return NextResponse.json({ ok: true, recommendation_id, action })
}
