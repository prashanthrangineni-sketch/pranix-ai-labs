/**
 * app/api/founder/execution/route.ts
 * P11 — Controlled Execution Engine
 *
 * Evaluates execution eligibility for every authority-approved operation.
 * Derives state from:
 *   • Authority records    (P10 — /api/founder/authority)
 *   • Founder Mode         (P9  — /api/founder/modes)
 *   • Governance verdicts  (P8  — /api/founder/governance)
 *   • Operation metadata   (P6  — /api/founder/operations)
 *
 * Storage : execution_memory only — key p11:execution:<operation_id>
 * Execution: READ-ONLY SIMULATION ONLY — no real execution performed.
 * No GitHub / Supabase / Vercel / Doppler writes.
 */

import { NextRequest, NextResponse } from 'next/server'

// ────────────────────────────── Types

export type ExecutionStatus =
  | 'queued'
  | 'eligible'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'blocked'

export interface ExecutionRecord {
  execution_id:       string
  operation_id:       string
  operation_title:    string
  authority_id:       string
  authority_status:   string
  mode_id:            string
  governance_verdict: string
  execution_status:   ExecutionStatus
  execution_reason:   string
  read_only:          boolean
  started_at:         string | null
  completed_at:       string | null
  duration_ms:        number | null
  result_summary:     string | null
  evaluated_at:       string
}

// ────────────────────────────── Helpers

function nowIso() { return new Date().toISOString() }

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
const emKey      = (op_id: string) => `p11:execution:${op_id}`

async function readFromMemory(op_id: string): Promise<ExecutionRecord | null> {
  try {
    const j = await fetchJson(`${EM_BASE}?project=${EM_PROJECT}&key=${emKey(op_id)}`)
    return (j?.value as ExecutionRecord) ?? null
  } catch { return null }
}

async function writeToMemory(record: ExecutionRecord): Promise<void> {
  try {
    await fetch(`${appBase()}${EM_BASE}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project:   EM_PROJECT,
        key:       emKey(record.operation_id),
        value:     record,
        ttl_hours: 48,
      }),
    })
  } catch { /* non-fatal */ }
}

// ────────────────────────────── Eligibility evaluation

interface EvalParams {
  operation_id:       string
  operation_title:    string
  execution_mode:     string
  risk_level:         string
  mode_id:            string
  authority_status:   string
  authority_id:       string
  governance_verdict: string
  persisted:          ExecutionRecord | null
}

function evaluateExecution(p: EvalParams): ExecutionRecord {
  const {
    operation_id, operation_title, execution_mode, risk_level,
    mode_id, authority_status, authority_id, governance_verdict, persisted,
  } = p

  const execution_id  = `exec_${operation_id}`
  const evaluated_at  = nowIso()
  const isReadOnly    = execution_mode === 'read_only' || risk_level === 'low'

  // Preserve terminal states across reloads
  if (persisted) {
    const terminal: ExecutionStatus[] = ['completed', 'failed']
    if (terminal.includes(persisted.execution_status)) {
      return { ...persisted, evaluated_at }
    }
    // Preserve an in-progress eligible/executing record if authority is still valid
    if (
      (persisted.execution_status === 'eligible' || persisted.execution_status === 'executing') &&
      authority_status === 'authorized'
    ) {
      return { ...persisted, evaluated_at }
    }
  }

  const base: Omit<ExecutionRecord, 'execution_status' | 'execution_reason' | 'started_at' | 'completed_at' | 'duration_ms' | 'result_summary'> = {
    execution_id, operation_id, operation_title,
    authority_id, authority_status,
    mode_id, governance_verdict,
    read_only: true,        // P11 is always read-only
    evaluated_at,
  }

  // Authority must be authorized before any eligibility
  if (authority_status !== 'authorized') {
    const reasonMap: Record<string, string> = {
      pending:  'Awaiting founder approval — execution queued until authority is granted.',
      blocked:  'Authority blocked by governance — operation cannot execute.',
      expired:  'Authority expired — re-authorization required before execution.',
      revoked:  'Authority was revoked by Founder — execution permanently blocked.',
    }
    return {
      ...base,
      execution_status: authority_status === 'blocked' || authority_status === 'revoked' ? 'blocked' : 'queued',
      execution_reason: reasonMap[authority_status] ?? `Authority status: ${authority_status}.`,
      started_at: null, completed_at: null, duration_ms: null, result_summary: null,
    }
  }

  // ── Authority is authorized. Apply mode rules. ──

  // MODE_A: never auto-execute
  if (mode_id === 'MODE_A') {
    return {
      ...base,
      execution_status: 'queued',
      execution_reason: 'MODE_A (Founder Controlled) — no automatic execution permitted.',
      started_at: null, completed_at: null, duration_ms: null, result_summary: null,
    }
  }

  // MODE_B: founder-approved only (authority already confirmed above, mark eligible)
  if (mode_id === 'MODE_B') {
    return {
      ...base,
      execution_status: 'eligible',
      execution_reason: 'Founder-approved in MODE_B — eligible for read-only execution.',
      started_at: null, completed_at: null, duration_ms: null, result_summary: null,
    }
  }

  // MODE_C: read-only ops are auto-eligible; write ops stay queued
  if (mode_id === 'MODE_C') {
    if (isReadOnly) {
      return {
        ...base,
        execution_status: 'eligible',
        execution_reason: 'Read-only operation auto-eligible in MODE_C.',
        started_at: null, completed_at: null, duration_ms: null, result_summary: null,
      }
    }
    return {
      ...base,
      execution_status: 'queued',
      execution_reason: 'Write/high-risk operation queued in MODE_C — requires explicit trigger.',
      started_at: null, completed_at: null, duration_ms: null, result_summary: null,
    }
  }

  // MODE_D: governance + authority determine eligibility
  if (governance_verdict === 'blocked') {
    return {
      ...base,
      execution_status: 'blocked',
      execution_reason: 'Governance blocked this operation in MODE_D.',
      started_at: null, completed_at: null, duration_ms: null, result_summary: null,
    }
  }
  return {
    ...base,
    execution_status: 'eligible',
    execution_reason: 'Authority + governance approved — eligible for execution in MODE_D.',
    started_at: null, completed_at: null, duration_ms: null, result_summary: null,
  }
}

// ────────────────────────────── GET /api/founder/execution

export async function GET() {
  const [opsData, authorityData, modesData, govData] = await Promise.all([
    fetchJson('/api/founder/operations'),
    fetchJson('/api/founder/authority'),
    fetchJson('/api/founder/modes'),
    fetchJson('/api/founder/governance'),
  ])

  type RawOp = { operation_id: string; title: string; risk_level?: string; execution_mode?: string }
  const allOps: RawOp[] = [
    ...(opsData?.queued    ?? []),
    ...(opsData?.ready     ?? []),
    ...(opsData?.executing ?? []),
  ]

  // Build authority lookup: operation_id -> { status, authority_id }
  type AuthRec = { operation_id: string; authority_id: string; authorization_status: string }
  const authMap = new Map<string, { status: string; authority_id: string }>()
  const authBuckets = ['pending','authorized','blocked','expired','revoked'] as const
  for (const bucket of authBuckets) {
    for (const rec of (authorityData?.[bucket] ?? []) as AuthRec[]) {
      authMap.set(rec.operation_id, {
        status:       rec.authorization_status,
        authority_id: rec.authority_id,
      })
    }
  }

  // Build governance lookup
  type GovEntry = { operation_id: string; verdict: string }
  const govMap = new Map<string, string>(
    (govData?.evaluations ?? []).map((e: GovEntry) => [e.operation_id, e.verdict])
  )

  const mode_id: string = modesData?.active_mode?.mode_id ?? 'MODE_A'

  const records: ExecutionRecord[] = await Promise.all(
    allOps.map(async op => {
      const persisted  = await readFromMemory(op.operation_id)
      const auth       = authMap.get(op.operation_id) ?? { status: 'pending', authority_id: `auth_${op.operation_id}` }
      const gov_verdict = govMap.get(op.operation_id) ?? 'needs_approval'

      const record = evaluateExecution({
        operation_id:       op.operation_id,
        operation_title:    op.title,
        execution_mode:     op.execution_mode  ?? 'standard',
        risk_level:         op.risk_level      ?? 'medium',
        mode_id,
        authority_status:   auth.status,
        authority_id:       auth.authority_id,
        governance_verdict: gov_verdict,
        persisted,
      })
      await writeToMemory(record)
      return record
    })
  )

  return NextResponse.json({
    queued:         records.filter(r => r.execution_status === 'queued'),
    eligible:       records.filter(r => r.execution_status === 'eligible'),
    executing:      records.filter(r => r.execution_status === 'executing'),
    completed:      records.filter(r => r.execution_status === 'completed'),
    failed:         records.filter(r => r.execution_status === 'failed'),
    blocked:        records.filter(r => r.execution_status === 'blocked'),
    mode_id,
    total:          records.length,
    evaluated_at:   nowIso(),
  })
}

// ────────────────────────────── POST /api/founder/execution
// Supports mark_complete and mark_failed for read-only simulation

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { action, operation_id, result_summary } =
    body as { action: string; operation_id: string; result_summary?: string }

  if (!operation_id) {
    return NextResponse.json({ error: 'operation_id required' }, { status: 400 })
  }

  const existing = await readFromMemory(operation_id)
  if (!existing) {
    return NextResponse.json(
      { error: 'No execution record. Call GET first.' },
      { status: 404 }
    )
  }

  if (action === 'mark_complete') {
    const now = nowIso()
    const started_at = existing.started_at ?? now
    const updated: ExecutionRecord = {
      ...existing,
      execution_status: 'completed',
      execution_reason: 'Marked complete by Founder (read-only simulation).',
      started_at,
      completed_at: now,
      duration_ms:  new Date(now).getTime() - new Date(started_at).getTime(),
      result_summary: result_summary ?? 'Completed successfully (read-only — no real writes performed).',
      evaluated_at: now,
    }
    await writeToMemory(updated)
    return NextResponse.json({ success: true, record: updated })
  }

  if (action === 'mark_failed') {
    const now = nowIso()
    const updated: ExecutionRecord = {
      ...existing,
      execution_status: 'failed',
      execution_reason: 'Marked failed by Founder.',
      started_at: existing.started_at ?? now,
      completed_at: now,
      duration_ms: null,
      result_summary: result_summary ?? 'Failed (read-only — no real writes performed).',
      evaluated_at: now,
    }
    await writeToMemory(updated)
    return NextResponse.json({ success: true, record: updated })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
