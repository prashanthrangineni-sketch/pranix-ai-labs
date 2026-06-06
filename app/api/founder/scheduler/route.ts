// app/api/founder/scheduler/route.ts
// P7 — Founder OS Scheduler.
// GET  — scores every ready/queued operation, returns prioritised schedule
//         including next_best_action, workload_score, risk_score
//
// Storage: persists schedule scores to execution_memory key p7:schedule:<op_id>
// NO GitHub / Vercel / Supabase row writes.
// NO execution — pure read + score + persist.

import { NextResponse }         from 'next/server'
import { createServerClient }  from '@/lib/supabase'
import { getControlPlane }     from '@/app/lib/control-plane'
import type { Operation }      from '@/app/api/founder/operations/route'

export const runtime    = 'nodejs'
export const dynamic    = 'force-dynamic'
export const revalidate = 0

const PROJECT    = 'pranix-dashboard'
const OP_PREFIX  = 'p6:operation:'
const SCH_PREFIX = 'p7:schedule:'
const TTL_MS     = 30 * 24 * 3600 * 1000

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ScheduleEntry {
  operation_id:       string
  title:              string
  category:           string
  risk_level:         string
  priority_score:     number   // 0-100 composite
  urgency_score:      number   // 0-100
  founder_value_score:number   // 0-100
  dependency_score:  number   // 0-100 (lower = more blocked)
  risk_score:        number   // 0-100 (higher = more risky)
  execution_order:   number   // 1-based rank
  blocked_by:        string[]  // operation_ids that block this one
  can_run_now:       boolean
  tier:              'critical' | 'high' | 'medium' | 'low'
  reason:            string
  expected_impact:   string
  scheduled_at:      string
}

export interface SchedulerResponse {
  ready_now:         ScheduleEntry[]
  blocked:           ScheduleEntry[]
  waiting_approval:  ScheduleEntry[]
  next_best_action:  ScheduleEntry | null
  workload_score:    number   // 0-100
  system_risk_score: number   // 0-100
  total_operations:  number
  generated_at:      string
}

// ── Auth ──────────────────────────────────────────────────────────────────────
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

// ── Scoring engine ────────────────────────────────────────────────────────────

// Urgency: derived from category + risk_level + title keywords
function computeUrgency(op: Operation): number {
  let score = 40
  const t = op.title.toLowerCase()
  const d = op.description.toLowerCase()

  // Risk level contribution
  if (op.risk_level === 'critical') score += 40
  else if (op.risk_level === 'high') score += 25
  else if (op.risk_level === 'medium') score += 10
  else score += 0

  // Category urgency
  const catBonus: Record<string, number> = {
    security:       20, infrastructure: 15, provider: 15,
    deployment:     12, monitoring:     10, workflow: 5,
    cost:           3,  founder:        8,
  }
  score += catBonus[op.category] ?? 0

  // Keyword urgency
  if (t.includes('fail') || t.includes('error') || t.includes('outage'))   score += 15
  if (t.includes('block') || t.includes('missing'))                         score += 12
  if (t.includes('rotate') || t.includes('expired'))                        score += 10
  if (t.includes('launch') || t.includes('deploy'))                         score += 8
  if (t.includes('revenue') || t.includes('customer'))                      score += 8
  if (t.includes('security') || t.includes('token') || t.includes('key'))  score += 8
  if (t.includes('anthropic') || t.includes('provider'))                    score += 6

  return Math.min(100, score)
}

// Founder value: how much does this move the needle?
function computeFounderValue(op: Operation): number {
  let score = 30
  const t = op.title.toLowerCase()

  // High-value patterns
  if (t.includes('launch') || t.includes('ship') || t.includes('release'))  score += 30
  if (t.includes('revenue') || t.includes('payment') || t.includes('plan')) score += 28
  if (t.includes('customer') || t.includes('user') || t.includes('signup')) score += 25
  if (t.includes('provider') || t.includes('enable'))                        score += 20
  if (t.includes('deploy') || t.includes('production'))                      score += 18
  if (t.includes('security') || t.includes('rotate'))                        score += 15
  if (t.includes('monitor') || t.includes('alert'))                          score += 12
  if (t.includes('audit'))                                                    score += 10
  if (t.includes('cleanup') || t.includes('stale') || t.includes('clear'))  score += 5

  // Category value
  const catVal: Record<string, number> = {
    security:       18, provider:       16, deployment:    14,
    infrastructure: 12, monitoring:     10, workflow:       8,
    founder:        10, cost:            6,
  }
  score += catVal[op.category] ?? 0

  return Math.min(100, score)
}

// Dependency score: 100 = fully independent, lower = has blockers
function computeDependency(
  op: Operation,
  allOps: Operation[],
  providerStatuses: Record<string, string>,
): { score: number; blocked_by: string[] } {
  const blockedBy: string[] = []

  // Provider ops depend on nothing; infra ops may depend on provider ops
  const t = op.title.toLowerCase()

  // If this op needs a provider, check if provider is available
  const providerNeeded =
    t.includes('anthropic') ? 'anthropic' :
    t.includes('openai')    ? 'openai'    :
    t.includes('gemini')    ? 'gemini'    :
    t.includes('ollama')    ? 'ollama'    : null

  if (providerNeeded) {
    const pStatus = providerStatuses[providerNeeded] ?? 'unknown'
    if (pStatus === 'disabled_billing_required' || pStatus === 'offline') {
      // This IS the fix op — not blocked, it IS the blocker resolver
      // So no dep penalty for provider ops
    }
  }

  // Check if a prerequisite op is in the queue ahead
  const prereqTitles: Record<string, string[]> = {
    'audit deployments':           ['enable deployment monitoring'],
    'fix deployment configuration':['enable deployment monitoring'],
    're-run integrity verification':['audit deployments'],
  }
  const myLower = op.title.toLowerCase()
  for (const [opTitle, prereqs] of Object.entries(prereqTitles)) {
    if (myLower.includes(opTitle)) {
      for (const prereq of prereqs) {
        const found = allOps.find(
          o => o.title.toLowerCase().includes(prereq) &&
               o.operation_id !== op.operation_id &&
               (o.status === 'ready' || o.status === 'queued')
        )
        if (found) blockedBy.push(found.operation_id)
      }
    }
  }

  const score = blockedBy.length === 0 ? 100 : Math.max(0, 100 - blockedBy.length * 30)
  return { score, blocked_by: blockedBy }
}

// Risk: execution risk of running this op now (lower = safer)
function computeRisk(op: Operation): number {
  let score = 10
  const t = op.title.toLowerCase()

  if (op.risk_level === 'critical') score += 50
  else if (op.risk_level === 'high') score += 30
  else if (op.risk_level === 'medium') score += 15

  if (t.includes('rotate') || t.includes('delete') || t.includes('remove')) score += 15
  if (t.includes('production') || t.includes('deploy'))                      score += 12
  if (t.includes('migrate') || t.includes('schema'))                         score += 20
  if (t.includes('enable') || t.includes('configure'))                       score += 5
  if (t.includes('audit') || t.includes('monitor'))                          score += 3
  if (t.includes('cleanup') || t.includes('stale'))                          score += 4

  // Read-only ops are very safe
  if (op.execution_mode === 'manual') score -= 5

  return Math.min(100, Math.max(0, score))
}

// Composite priority: weighted sum
function composePriority(urgency: number, value: number, dependency: number, risk: number): number {
  // Weights: urgency 35%, value 35%, dependency 20%, inverse_risk 10%
  const inverseRisk = 100 - risk
  return Math.round(urgency * 0.35 + value * 0.35 + dependency * 0.20 + inverseRisk * 0.10)
}

function priorityTier(score: number): ScheduleEntry['tier'] {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

function buildReason(op: Operation, urgency: number, value: number, dep: { blocked_by: string[] }): string {
  const parts: string[] = []
  const t = op.title.toLowerCase()

  if (dep.blocked_by.length > 0)
    return `Blocked by ${dep.blocked_by.length} prerequisite operation${dep.blocked_by.length > 1 ? 's' : ''}.`

  if (urgency >= 80) parts.push('Urgent system issue')
  if (t.includes('provider') || t.includes('anthropic') || t.includes('openai'))
    parts.push('Unblocks AI model access for multiple workflows')
  if (t.includes('security') || t.includes('rotate') || t.includes('token'))
    parts.push('Reduces security exposure')
  if (t.includes('deploy') || t.includes('monitor'))
    parts.push('Improves production visibility')
  if (t.includes('launch') || t.includes('revenue'))
    parts.push('Direct impact on revenue and growth')
  if (t.includes('cleanup') || t.includes('stale'))
    parts.push('Reduces operational noise')
  if (parts.length === 0) parts.push(`${op.category} operation ready for execution`)

  return parts.join('. ') + '.'
}

function buildImpact(op: Operation, value: number): string {
  if (value >= 80) return 'Critical — immediate system or revenue impact'
  if (value >= 65) return 'High — unblocks key workflows or providers'
  if (value >= 50) return 'Medium — improves reliability or performance'
  if (value >= 35) return 'Low — cleanup or maintenance'
  return 'Minimal — background optimization'
}

// ── Load provider health ───────────────────────────────────────────────────────
async function loadProviderStatuses(): Promise<Record<string, string>> {
  const cp = getControlPlane()
  const { data } = await cp
    .from('execution_memory')
    .select('key, value')
    .eq('project', PROJECT)
    .like('key', 'provider:health:%')
    .gt('expires_at', new Date().toISOString())
    .limit(50)
  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    const name = (row.key as string).replace('provider:health:', '')
    const val  = row.value as Record<string, unknown>
    map[name]  = (val?.status ?? 'unknown') as string
  }
  return map
}

// ── Load all operations ────────────────────────────────────────────────────────
async function loadAllOps(): Promise<Operation[]> {
  const cp = getControlPlane()
  const { data } = await cp
    .from('execution_memory')
    .select('key, value')
    .eq('project', PROJECT)
    .like('key', `${OP_PREFIX}%`)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(200)
  return (data ?? []).map(r => r.value as Operation)
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  if (!await assertFounder())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [ops, providerStatuses] = await Promise.all([
    loadAllOps(),
    loadProviderStatuses(),
  ])

  // Only score active (non-terminal) ops
  const scoreable = ops.filter(o => o.status === 'ready' || o.status === 'queued')
  const blockedOps = ops.filter(o => o.status === 'blocked')

  const now = new Date().toISOString()
  const entries: ScheduleEntry[] = []

  for (const op of scoreable) {
    const urgency   = computeUrgency(op)
    const value     = computeFounderValue(op)
    const dep       = computeDependency(op, scoreable, providerStatuses)
    const risk      = computeRisk(op)
    const priority  = composePriority(urgency, value, dep.score, risk)
    const tier      = priorityTier(priority)
    const canRunNow = dep.blocked_by.length === 0

    entries.push({
      operation_id:        op.operation_id,
      title:               op.title,
      category:            op.category,
      risk_level:          op.risk_level,
      priority_score:      priority,
      urgency_score:       urgency,
      founder_value_score: value,
      dependency_score:    dep.score,
      risk_score:          risk,
      execution_order:     0,  // set after sort
      blocked_by:          dep.blocked_by,
      can_run_now:         canRunNow,
      tier,
      reason:       buildReason(op, urgency, value, dep),
      expected_impact: buildImpact(op, value),
      scheduled_at: now,
    })
  }

  // Sort by priority descending, then by urgency
  entries.sort((a, b) =>
    b.priority_score - a.priority_score || b.urgency_score - a.urgency_score
  )
  entries.forEach((e, i) => { e.execution_order = i + 1 })

  // Persist schedule entries to execution_memory
  const cp = getControlPlane()
  for (const entry of entries) {
    await cp.from('execution_memory').upsert(
      { project: PROJECT, key: `${SCH_PREFIX}${entry.operation_id}`, value: entry,
        expires_at: new Date(Date.now() + TTL_MS).toISOString() },
      { onConflict: 'project,key', ignoreDuplicates: false },
    )
  }

  const readyNow  = entries.filter(e => e.can_run_now)
  const blocked   = [
    ...entries.filter(e => !e.can_run_now),
    ...blockedOps.map(op => ({
      operation_id:        op.operation_id,
      title:               op.title,
      category:            op.category,
      risk_level:          op.risk_level,
      priority_score:      0,
      urgency_score:       0,
      founder_value_score: 0,
      dependency_score:    0,
      risk_score:          0,
      execution_order:     999,
      blocked_by:          ['cancelled'],
      can_run_now:         false,
      tier:                'low'  as const,
      reason:              'Cancelled by founder.',
      expected_impact:     'None',
      scheduled_at:        now,
    })),
  ]

  const nextBestAction = readyNow[0] ?? null

  // Workload score: number of active ops × 10, capped at 100
  const workloadScore = Math.min(100, scoreable.length * 12)

  // System risk: max of top-3 risk scores
  const topRisks = readyNow.slice(0, 3).map(e => e.risk_score)
  const systemRiskScore = topRisks.length > 0
    ? Math.round(topRisks.reduce((a, b) => a + b, 0) / topRisks.length)
    : 0

  const response: SchedulerResponse = {
    ready_now:         readyNow,
    blocked,
    waiting_approval:  [],   // future: ops awaiting founder confirmation
    next_best_action:  nextBestAction,
    workload_score:    workloadScore,
    system_risk_score: systemRiskScore,
    total_operations:  ops.length,
    generated_at:      now,
  }

  return NextResponse.json(response)
}
