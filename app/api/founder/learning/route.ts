/**
 * app/api/founder/learning/route.ts
 * P12 — Learning & Outcome Engine
 *
 * Generates outcome learnings from completed execution records.
 * Sources:
 *   • Execution records  (P11 — /api/founder/execution)
 *   • Authority records  (P10 — /api/founder/authority)
 *   • Governance data    (P8  — /api/founder/governance)
 *   • Recommendations    (P5  — /api/founder/recommendations)
 *
 * Storage : execution_memory only — key p12:learning:<operation_id>
 * No real execution. No GitHub / Supabase / Vercel / Doppler writes.
 */

import { NextRequest, NextResponse } from 'next/server'

// ────────────────────────────── Types

export type OutcomeType  = 'success' | 'partial_success' | 'failure' | 'blocked' | 'cancelled'
export type LearningType = 'execution' | 'governance' | 'authority' | 'recommendation' | 'scheduler'

export interface LearningRecord {
  learning_id:         string
  operation_id:        string
  operation_title:     string
  outcome:             OutcomeType
  confidence:          number        // 0–100
  success_score:       number        // 0–100
  failure_score:       number        // 0–100
  learning_type:       LearningType
  insight:             string
  recommendation:      string
  contributing_factors: string[]
  created_at:          string
}

export interface LearningEngine {
  success_patterns:        string[]
  failure_patterns:        string[]
  top_insights:            string[]
  recommendation_quality:  number    // 0–100 — avg confidence of approved high-confidence recs
  learning_count:          number
  records:                 LearningRecord[]
  evaluated_at:            string
}

// ────────────────────────────── Helpers

function nowIso() { return new Date().toISOString() }
function uid(prefix: string, seed: string) {
  return `${prefix}_${seed.replace(/[^a-z0-9]/gi, '').slice(0, 12)}_${Date.now().toString(36)}`
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
const emKey      = (op_id: string) => `p12:learning:${op_id}`

async function readFromMemory(op_id: string): Promise<LearningRecord | null> {
  try {
    const j = await fetchJson(`${EM_BASE}?project=${EM_PROJECT}&key=${emKey(op_id)}`)
    return (j?.value as LearningRecord) ?? null
  } catch { return null }
}

async function writeToMemory(record: LearningRecord): Promise<void> {
  try {
    await fetch(`${appBase()}${EM_BASE}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project:   EM_PROJECT,
        key:       emKey(record.operation_id),
        value:     record,
        ttl_hours: 168,   // 7 days — learnings persist longer than authority/execution
      }),
    })
  } catch { /* non-fatal */ }
}

// ────────────────────────────── Learning generation

interface GenParams {
  operation_id:        string
  operation_title:     string
  execution_status:    string
  execution_reason:    string
  result_summary:      string | null
  authority_status:    string
  governance_verdict:  string
  mode_id:             string
  rec_confidence:      number | null   // confidence of source recommendation (0–100)
  block_count:         number          // how many times this op was blocked
  reject_count:        number          // how many times authority was denied/revoked
  persisted:           LearningRecord | null
}

function generateLearning(p: GenParams): LearningRecord | null {
  const {
    operation_id, operation_title, execution_status, execution_reason,
    result_summary, authority_status, governance_verdict, mode_id,
    rec_confidence, block_count, reject_count, persisted,
  } = p

  // Only regenerate if the operation has reached a learnable state
  const learnable = ['completed', 'failed', 'blocked']
  if (!learnable.includes(execution_status) && block_count < 2 && reject_count < 2) {
    return persisted   // return existing record or null
  }

  // Don’t overwrite a completed learning unless it’s a richer terminal state
  if (persisted?.outcome === 'success' && execution_status !== 'completed') {
    return persisted
  }

  const created_at = persisted?.created_at ?? nowIso()

  // ── Case 1: Execution completed successfully
  if (execution_status === 'completed') {
    const confidence = Math.min(100, 60 + (rec_confidence ?? 0) * 0.4)
    const factors = [
      `Mode: ${mode_id}`,
      `Governance: ${governance_verdict}`,
      `Authority: ${authority_status}`,
      ...(rec_confidence != null ? [`Rec confidence: ${rec_confidence}%`] : []),
    ]
    return {
      learning_id:          uid('lrn', operation_id),
      operation_id, operation_title,
      outcome:              'success',
      confidence:           Math.round(confidence),
      success_score:        85,
      failure_score:        10,
      learning_type:        'execution',
      insight:              `"${operation_title}" completed successfully in ${mode_id}. Governance verdict was ${governance_verdict}.`,
      recommendation:       `Operations of this type can be prioritized. Consider auto-approving similar operations in ${mode_id}.`,
      contributing_factors: factors,
      created_at,
    }
  }

  // ── Case 2: Execution failed
  if (execution_status === 'failed') {
    const factors = [
      `Mode: ${mode_id}`,
      `Reason: ${execution_reason.slice(0, 80)}`,
      `Governance: ${governance_verdict}`,
    ]
    return {
      learning_id:          uid('lrn', operation_id),
      operation_id, operation_title,
      outcome:              'failure',
      confidence:           72,
      success_score:        10,
      failure_score:        85,
      learning_type:        'execution',
      insight:              `"${operation_title}" failed. ${result_summary ?? execution_reason}`,
      recommendation:       `Review the execution reason before re-queuing. Check governance policy coverage for this operation type.`,
      contributing_factors: factors,
      created_at,
    }
  }

  // ── Case 3: Blocked repeatedly by governance
  if (execution_status === 'blocked' && block_count >= 2) {
    return {
      learning_id:          uid('lrn', operation_id),
      operation_id, operation_title,
      outcome:              'blocked',
      confidence:           80,
      success_score:        5,
      failure_score:        70,
      learning_type:        'governance',
      insight:              `"${operation_title}" has been blocked ${block_count} times. Governance verdict: ${governance_verdict}.`,
      recommendation:       `Review the governing policy for this operation. If the policy is too restrictive, consider adjusting max_risk or scope.`,
      contributing_factors: [`Block count: ${block_count}`, `Governance: ${governance_verdict}`, `Mode: ${mode_id}`],
      created_at,
    }
  }

  // ── Case 4: Rejected/revoked repeatedly by authority
  if (reject_count >= 2) {
    return {
      learning_id:          uid('lrn', operation_id),
      operation_id, operation_title,
      outcome:              'cancelled',
      confidence:           75,
      success_score:        5,
      failure_score:        60,
      learning_type:        'authority',
      insight:              `"${operation_title}" has been rejected or revoked ${reject_count} times by Founder authority.`,
      recommendation:       `This operation type may not align with current Founder priorities. Consider archiving or redesigning the recommendation source.`,
      contributing_factors: [`Reject count: ${reject_count}`, `Mode: ${mode_id}`, `Authority: ${authority_status}`],
      created_at,
    }
  }

  // ── Case 5: Single blocked with high-confidence rec
  if (execution_status === 'blocked' && rec_confidence != null && rec_confidence >= 80) {
    return {
      learning_id:          uid('lrn', operation_id),
      operation_id, operation_title,
      outcome:              'blocked',
      confidence:           rec_confidence,
      success_score:        20,
      failure_score:        60,
      learning_type:        'recommendation',
      insight:              `High-confidence recommendation (${rec_confidence}%) for "${operation_title}" was blocked by governance.`,
      recommendation:       `Consider whether the governing policy is correctly calibrated for high-confidence recommendations.`,
      contributing_factors: [`Rec confidence: ${rec_confidence}%`, `Governance: ${governance_verdict}`],
      created_at,
    }
  }

  return persisted
}

// ────────────────────────────── Engine aggregation

function buildEngine(records: LearningRecord[]): Omit<LearningEngine, 'records' | 'evaluated_at'> {
  if (records.length === 0) {
    return {
      success_patterns:       [],
      failure_patterns:       [],
      top_insights:           [],
      recommendation_quality: 0,
      learning_count:         0,
    }
  }

  const successes  = records.filter(r => r.outcome === 'success')
  const failures   = records.filter(r => r.outcome === 'failure' || r.outcome === 'blocked')
  const recLearns  = records.filter(r => r.learning_type === 'recommendation')

  const success_patterns = successes.map(r =>
    `${r.operation_title}: ${r.contributing_factors.slice(0, 2).join(', ')}`
  ).slice(0, 5)

  const failure_patterns = failures.map(r =>
    `${r.operation_title}: ${r.insight.slice(0, 80)}`
  ).slice(0, 5)

  const top_insights = records
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
    .map(r => r.insight)

  const recommendation_quality = recLearns.length > 0
    ? Math.round(recLearns.reduce((sum, r) => sum + r.confidence, 0) / recLearns.length)
    : successes.length > 0
    ? Math.round(successes.reduce((sum, r) => sum + r.success_score, 0) / successes.length)
    : 0

  return {
    success_patterns,
    failure_patterns,
    top_insights,
    recommendation_quality,
    learning_count: records.length,
  }
}

// ────────────────────────────── GET /api/founder/learning

export async function GET() {
  const [execData, authorityData, govData, recData] = await Promise.all([
    fetchJson('/api/founder/execution'),
    fetchJson('/api/founder/authority'),
    fetchJson('/api/founder/governance'),
    fetchJson('/api/founder/recommendations'),
  ])

  type ExecRec = {
    operation_id: string; operation_title: string
    execution_status: string; execution_reason: string
    result_summary: string | null; authority_status: string
    governance_verdict: string; mode_id: string
  }
  const allExec: ExecRec[] = [
    ...(execData?.completed ?? []),
    ...(execData?.failed    ?? []),
    ...(execData?.blocked   ?? []),
    ...(execData?.queued    ?? []),
    ...(execData?.eligible  ?? []),
  ]

  // Build authority reject counts: how many denied/revoked per op
  type AuthRec = { operation_id: string; authorization_status: string }
  const rejectCounts = new Map<string, number>()
  for (const bucket of ['blocked', 'expired', 'revoked'] as const) {
    for (const rec of (authorityData?.[bucket] ?? []) as AuthRec[]) {
      rejectCounts.set(rec.operation_id, (rejectCounts.get(rec.operation_id) ?? 0) + 1)
    }
  }

  // Build block counts from governance
  type GovEntry = { operation_id: string; verdict: string }
  const blockCounts = new Map<string, number>()
  for (const e of (govData?.evaluations ?? []) as GovEntry[]) {
    if (e.verdict === 'blocked') {
      blockCounts.set(e.operation_id, (blockCounts.get(e.operation_id) ?? 0) + 1)
    }
  }

  // Build rec confidence map
  type RecItem = { operation_id?: string; source_operation_id?: string; confidence?: number }
  const recConfidence = new Map<string, number>()
  for (const rec of (recData?.recommendations ?? []) as RecItem[]) {
    const opId = rec.operation_id ?? rec.source_operation_id
    if (opId && rec.confidence != null) {
      recConfidence.set(opId, rec.confidence)
    }
  }

  const newRecords: LearningRecord[] = []

  for (const op of allExec) {
    const persisted   = await readFromMemory(op.operation_id)
    const result      = generateLearning({
      operation_id:       op.operation_id,
      operation_title:    op.operation_title,
      execution_status:   op.execution_status,
      execution_reason:   op.execution_reason,
      result_summary:     op.result_summary,
      authority_status:   op.authority_status,
      governance_verdict: op.governance_verdict,
      mode_id:            op.mode_id,
      rec_confidence:     recConfidence.get(op.operation_id) ?? null,
      block_count:        blockCounts.get(op.operation_id)   ?? 0,
      reject_count:       rejectCounts.get(op.operation_id)  ?? 0,
      persisted,
    })
    if (result) {
      await writeToMemory(result)
      newRecords.push(result)
    }
  }

  const engine = buildEngine(newRecords)

  return NextResponse.json({
    ...engine,
    records:      newRecords,
    evaluated_at: nowIso(),
  } as LearningEngine)
}

// ────────────────────────────── POST /api/founder/learning
// Founder can manually record a learning note for any operation

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const {
    operation_id,
    operation_title,
    outcome,
    insight,
    recommendation,
    learning_type,
    confidence,
  } = body as {
    operation_id: string; operation_title: string
    outcome: OutcomeType; insight: string; recommendation: string
    learning_type?: LearningType; confidence?: number
  }

  if (!operation_id || !insight) {
    return NextResponse.json({ error: 'operation_id and insight are required' }, { status: 400 })
  }

  const record: LearningRecord = {
    learning_id:          uid('lrn', operation_id),
    operation_id,
    operation_title:      operation_title ?? operation_id,
    outcome:              outcome          ?? 'success',
    confidence:           confidence       ?? 70,
    success_score:        outcome === 'success' ? 80 : 20,
    failure_score:        outcome === 'failure' ? 80 : 20,
    learning_type:        learning_type    ?? 'execution',
    insight,
    recommendation:       recommendation   ?? '',
    contributing_factors: ['Founder note'],
    created_at:           nowIso(),
  }
  await writeToMemory(record)
  return NextResponse.json({ success: true, record })
}
