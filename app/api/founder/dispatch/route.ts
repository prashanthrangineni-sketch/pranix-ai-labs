// app/api/founder/dispatch/route.ts
// S3 — Scheduler Dispatch Engine
// Reads scheduler-ready operations, evaluates authority + governance + founder mode,
// produces DispatchRecord objects, and persists them to execution_memory.
// Read-only dispatch layer — does NOT execute operations.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export type DispatchStatus =
  | 'queued'
  | 'dispatched'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'blocked'

export type FounderModeId = 'MODE_A' | 'MODE_B' | 'MODE_C' | 'MODE_D'

export interface DispatchRecord {
  dispatch_id:       string
  operation_id:      string
  operation_title:   string
  schedule_id:       string
  authority_status:  string        // 'authorized' | 'pending' | 'blocked' | 'none'
  governance_status: string        // 'allowed' | 'needs_approval' | 'blocked' | 'none'
  founder_mode:      FounderModeId
  dispatch_status:   DispatchStatus
  dispatch_reason:   string
  priority_score:    number
  risk_score:        number
  scheduled_at:      string
  dispatched_at:     string | null
  expires_at:        string
  created_at:        string
}

interface DispatchEligibility {
  eligible:       boolean
  status:         DispatchStatus
  reason:         string
}

// ── Internal fetch helpers ─────────────────────────────────────────────────────

function baseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? ''
  return raw.startsWith('http') ? raw : `https://${raw}`
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${baseUrl()}${path}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch { return null }
}

// ── execution_memory helpers ──────────────────────────────────────────────────

const PROJECT  = 'pranix'
const MEM_PATH = '/api/founder/memory'

async function memRead(key: string): Promise<unknown> {
  const j = await fetchJson<{ value?: unknown }>(`${MEM_PATH}?project=${PROJECT}&key=${encodeURIComponent(key)}`)
  return j?.value ?? null
}

async function memWrite(key: string, value: unknown): Promise<void> {
  try {
    await fetch(`${baseUrl()}${MEM_PATH}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ project: PROJECT, key, value }),
      cache:   'no-store',
    })
  } catch { /* non-fatal */ }
}

// ── Eligibility evaluator ─────────────────────────────────────────────────────

function evaluateDispatch(opts: {
  operation_id:      string
  scheduler_ready:   boolean
  authority_status:  string
  governance_status: string
  founder_mode:      FounderModeId
  risk_score:        number
}): DispatchEligibility {
  const { scheduler_ready, authority_status, governance_status, founder_mode, risk_score } = opts

  // 1. Scheduler readiness is mandatory
  if (!scheduler_ready) {
    return { eligible: false, status: 'blocked', reason: 'Operation is not scheduler-ready' }
  }

  // 2. Authority is mandatory
  if (authority_status === 'blocked') {
    return { eligible: false, status: 'blocked', reason: 'Execution authority denied — operation blocked by authority layer' }
  }
  if (authority_status === 'pending') {
    return { eligible: false, status: 'blocked', reason: 'Execution authority pending founder approval' }
  }
  if (authority_status !== 'authorized') {
    return { eligible: false, status: 'blocked', reason: `Execution authority not established (status: ${authority_status || 'none'})` }
  }

  // 3. Governance is mandatory
  if (governance_status === 'blocked') {
    return { eligible: false, status: 'blocked', reason: 'Governance policy blocks execution of this operation' }
  }

  // 4. Founder mode rules
  switch (founder_mode) {
    case 'MODE_A':
      return { eligible: false, status: 'blocked', reason: 'MODE_A (Observer): dispatch is never permitted' }

    case 'MODE_B':
      // Dispatch only after explicit founder authorization — needs_approval governance counts as needing approval
      if (governance_status === 'needs_approval') {
        return { eligible: false, status: 'blocked', reason: 'MODE_B (Supervised): requires explicit founder authorization before dispatch' }
      }
      break

    case 'MODE_C':
      // Dispatch low-risk authorized operations only
      if (risk_score > 40) {
        return {
          eligible: false,
          status:   'blocked',
          reason:   `MODE_C (Assisted): only low-risk operations permitted (risk score ${risk_score}/100 exceeds threshold of 40)`,
        }
      }
      if (governance_status === 'needs_approval') {
        return { eligible: false, status: 'blocked', reason: 'MODE_C (Assisted): governance requires approval before dispatch' }
      }
      break

    case 'MODE_D':
      // Dispatch governance-approved operations — needs_approval is fine, we queue them
      // blocked is already handled above
      break

    default:
      return { eligible: false, status: 'blocked', reason: `Unknown founder mode: ${founder_mode}` }
  }

  // 5. All gates passed
  if (governance_status === 'needs_approval') {
    return {
      eligible: true,
      status:   'queued',
      reason:   'Governance requires approval — operation queued for founder review before dispatch',
    }
  }

  return {
    eligible: true,
    status:   'dispatched',
    reason:   'All execution requirements satisfied — ready for dispatch',
  }
}

// ── Build dispatch records ────────────────────────────────────────────────────

async function buildDispatchRecords(): Promise<DispatchRecord[]> {
  // Fetch required layers in parallel
  const [schedulerJson, authorityJson, governanceJson, modeJson] = await Promise.all([
    fetchJson<{
      ready_now:  Array<{ operation_id: string; title: string; schedule_id?: string; priority_score: number; risk_score: number; can_run_now: boolean }>
      blocked:    Array<{ operation_id: string; title: string; schedule_id?: string; priority_score: number; risk_score: number; can_run_now: boolean }>
    }>('/api/founder/scheduler'),
    fetchJson<{
      authorized: Array<{ operation_id: string; authorization_status: string }>
      pending:    Array<{ operation_id: string; authorization_status: string }>
      blocked:    Array<{ operation_id: string; authorization_status: string }>
    }>('/api/founder/authority'),
    fetchJson<{
      evaluations: Array<{ operation_id: string; verdict: string }>
    }>('/api/founder/governance'),
    fetchJson<{ active_mode?: { mode_id: string } }>('/api/founder/modes'),
  ])

  const schedulerReady = schedulerJson?.ready_now ?? []
  const schedulerBlocked = schedulerJson?.blocked ?? []
  const allScheduled = [...schedulerReady, ...schedulerBlocked]

  // Build lookup maps
  const authorityMap = new Map<string, string>()
  for (const r of [...(authorityJson?.authorized ?? []), ...(authorityJson?.pending ?? []), ...(authorityJson?.blocked ?? [])]) {
    authorityMap.set(r.operation_id, r.authorization_status)
  }

  const govMap = new Map<string, string>()
  for (const e of (governanceJson?.evaluations ?? [])) {
    govMap.set(e.operation_id, e.verdict)
  }

  const founderMode = (modeJson?.active_mode?.mode_id ?? 'MODE_A') as FounderModeId

  const now = new Date().toISOString()
  const records: DispatchRecord[] = []

  for (const entry of allScheduled) {
    const existingRaw = await memRead(`p14:dispatch:${entry.operation_id}`)
    const existing = existingRaw as DispatchRecord | null

    // Preserve terminal states — do not re-evaluate completed/failed dispatches
    if (existing?.dispatch_status === 'completed' || existing?.dispatch_status === 'failed') {
      records.push(existing)
      continue
    }

    const authorityStatus  = authorityMap.get(entry.operation_id) ?? 'none'
    const governanceStatus = govMap.get(entry.operation_id) ?? 'none'
    const schedulerReady_  = entry.can_run_now

    const eligibility = evaluateDispatch({
      operation_id:      entry.operation_id,
      scheduler_ready:   schedulerReady_,
      authority_status:  authorityStatus,
      governance_status: governanceStatus,
      founder_mode:      founderMode,
      risk_score:        entry.risk_score,
    })

    const dispatch_id = existing?.dispatch_id ?? `d-${entry.operation_id}-${Date.now()}`
    const record: DispatchRecord = {
      dispatch_id,
      operation_id:      entry.operation_id,
      operation_title:   entry.title,
      schedule_id:       entry.schedule_id ?? entry.operation_id,
      authority_status:  authorityStatus,
      governance_status: governanceStatus,
      founder_mode:      founderMode,
      dispatch_status:   eligibility.status,
      dispatch_reason:   eligibility.reason,
      priority_score:    entry.priority_score,
      risk_score:        entry.risk_score,
      scheduled_at:      existing?.scheduled_at ?? now,
      dispatched_at:     eligibility.status === 'dispatched' ? (existing?.dispatched_at ?? now) : null,
      expires_at:        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at:        existing?.created_at ?? now,
    }

    // Persist to execution_memory
    await memWrite(`p14:dispatch:${entry.operation_id}`, record)
    records.push(record)
  }

  return records
}

// ── GET /api/founder/dispatch ─────────────────────────────────────────────────

export async function GET() {
  try {
    const records = await buildDispatchRecords()

    const queued     = records.filter(r => r.dispatch_status === 'queued')
    const dispatched = records.filter(r => r.dispatch_status === 'dispatched')
    const blocked    = records.filter(r => r.dispatch_status === 'blocked')
    const eligible   = records.filter(r => r.dispatch_status === 'dispatched' || r.dispatch_status === 'queued')

    // Top candidate: highest priority dispatched, then queued
    const sorted = [...dispatched, ...queued].sort((a, b) => b.priority_score - a.priority_score)
    const top_candidate = sorted[0] ?? null

    return NextResponse.json({
      queued:        queued.length,
      dispatched:    dispatched.length,
      blocked:       blocked.length,
      eligible:      eligible.length,
      top_candidate,
      records,
      generated_at:  new Date().toISOString(),
    })
  } catch (err) {
    console.error('[dispatch] GET error:', err)
    return NextResponse.json({ error: 'Dispatch engine error' }, { status: 500 })
  }
}

// ── POST /api/founder/dispatch ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { action?: string; operation_id?: string }
    const { action, operation_id } = body

    if (!action || !operation_id) {
      return NextResponse.json({ error: 'action and operation_id required' }, { status: 400 })
    }

    const key = `p14:dispatch:${operation_id}`
    const existing = await memRead(key) as DispatchRecord | null

    if (!existing) {
      return NextResponse.json({ error: 'Dispatch record not found' }, { status: 404 })
    }

    if (action === 'create_dispatch') {
      // Re-evaluate and persist fresh dispatch
      const [authorityJson, governanceJson, modeJson, schedulerJson] = await Promise.all([
        fetchJson<{ authorized: Array<{ operation_id: string; authorization_status: string }> }>('/api/founder/authority'),
        fetchJson<{ evaluations: Array<{ operation_id: string; verdict: string }> }>('/api/founder/governance'),
        fetchJson<{ active_mode?: { mode_id: string } }>('/api/founder/modes'),
        fetchJson<{ ready_now: Array<{ operation_id: string; risk_score: number; can_run_now: boolean }> }>('/api/founder/scheduler'),
      ])

      const authorityStatus  = (authorityJson?.authorized ?? []).find(r => r.operation_id === operation_id)?.authorization_status ?? 'none'
      const governanceStatus = (governanceJson?.evaluations ?? []).find(e => e.operation_id === operation_id)?.verdict ?? 'none'
      const founderMode      = (modeJson?.active_mode?.mode_id ?? 'MODE_A') as FounderModeId
      const schedEntry       = (schedulerJson?.ready_now ?? []).find(e => e.operation_id === operation_id)

      const eligibility = evaluateDispatch({
        operation_id,
        scheduler_ready:   schedEntry?.can_run_now ?? false,
        authority_status:  authorityStatus,
        governance_status: governanceStatus,
        founder_mode:      founderMode,
        risk_score:        schedEntry?.risk_score ?? existing.risk_score,
      })

      const updated: DispatchRecord = {
        ...existing,
        authority_status:  authorityStatus,
        governance_status: governanceStatus,
        founder_mode:      founderMode,
        dispatch_status:   eligibility.status,
        dispatch_reason:   eligibility.reason,
        dispatched_at:     eligibility.status === 'dispatched' ? new Date().toISOString() : null,
      }

      await memWrite(key, updated)
      return NextResponse.json({ ok: true, record: updated })
    }

    if (action === 'cancel_dispatch') {
      const cancelled: DispatchRecord = {
        ...existing,
        dispatch_status: 'blocked',
        dispatch_reason: 'Manually cancelled by founder',
        dispatched_at:   null,
      }
      await memWrite(key, cancelled)
      return NextResponse.json({ ok: true, record: cancelled })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    console.error('[dispatch] POST error:', err)
    return NextResponse.json({ error: 'Dispatch engine error' }, { status: 500 })
  }
}
