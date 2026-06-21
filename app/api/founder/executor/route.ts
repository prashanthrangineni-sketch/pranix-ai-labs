// app/api/founder/executor/route.ts
// S6 — Autonomous Executor
// Reads leased queue records and connects them to the existing read-only
// execution pipeline. No write actions are performed — only GitHub reads,
// Supabase reads, Vercel reads, and Doppler reads are allowed.
// Queue status transitions are persisted to execution_memory.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { QueueRecord } from '@/app/api/founder/queue/route'

// ── Types ──────────────────────────────────────────────────────────────────

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'unverified'

export type VerificationStatus =
  | 'pending'
  | 'verified'
  | 'unverified'
  | 'failed'

export interface ExecutorRecord {
  execution_id:        string
  queue_id:            string
  activation_id:       string
  operation_id:        string
  operation_title:     string
  founder_mode:        string
  execution_status:    ExecutionStatus
  execution_reason:    string
  verification_status: VerificationStatus
  verification_notes:  string | null
  replay_available:    boolean
  analysis_available:  boolean
  started_at:          string | null
  completed_at:        string | null
  duration_ms:         number | null
  created_at:          string
  queue_status_synced: string   // last queue status at sync time
}

// ── Internal helpers ──────────────────────────────────────────────────────

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

// ── Gateway live check ────────────────────────────────────────────────────

async function isGatewayLive(): Promise<boolean> {
  try {
    const j = await fetchJson<{ gateway_live?: boolean }>('/api/founder/autonomy')
    return j?.gateway_live === true
  } catch { return false }
}

// ── Execution eligibility ──────────────────────────────────────────────────

function canExecute(q: QueueRecord): { ok: boolean; reason: string } {
  if (q.founder_mode === 'MODE_A') {
    return { ok: false, reason: 'MODE_A never executes' }
  }
  if (q.queue_status === 'dead_letter') {
    return { ok: false, reason: 'Queue item is in dead letter — execution blocked' }
  }
  if (q.queue_status !== 'leased' && q.queue_status !== 'executing') {
    return { ok: false, reason: `Queue item must be leased to execute (current: ${q.queue_status})` }
  }
  // Check lease expiry
  if (q.lease_expires_at && Date.now() > new Date(q.lease_expires_at).getTime()) {
    return { ok: false, reason: 'Lease has expired — re-lease required before execution' }
  }
  return { ok: true, reason: 'Eligible for autonomous execution' }
}

// ── Read-only execution pipeline integration ──────────────────────────────────
// Reads execution, replay, and analysis records for this operation.
// Does NOT trigger any writes.

async function readExecutionPipeline(operationId: string): Promise<{
  execution_found:  boolean
  replay_available: boolean
  analysis_available: boolean
  verification_status: VerificationStatus
  verification_notes: string | null
  duration_ms: number | null
}> {
  const [execJson, replayJson, analysisJson] = await Promise.all([
    fetchJson<{ records?: Array<{ operation_id: string; status: string; started_at?: string; completed_at?: string }> }>('/api/founder/execution'),
    fetchJson<{ replays?: Array<{ operation_id: string }> }>('/api/founder/replay'),
    fetchJson<{ analyses?: Array<{ operation_id: string }> }>('/api/founder/analysis'),
  ])

  const execRecords  = execJson?.records  ?? []
  const replayItems  = replayJson?.replays ?? []
  const analysisItems= analysisJson?.analyses ?? []

  const execRecord = execRecords.find(r => r.operation_id === operationId)
  const hasReplay  = replayItems.some(r  => r.operation_id === operationId)
  const hasAnalysis= analysisItems.some(r => r.operation_id === operationId)

  let duration_ms: number | null = null
  if (execRecord?.started_at && execRecord?.completed_at) {
    duration_ms = new Date(execRecord.completed_at).getTime() - new Date(execRecord.started_at).getTime()
  }

  // Verification: an execution is considered verified if the execution pipeline
  // has a record AND the gateway confirmed it was live at run time.
  let verification_status: VerificationStatus = 'pending'
  let verification_notes: string | null = null

  if (!execRecord) {
    verification_status = 'unverified'
    verification_notes  = 'No matching execution record found in pipeline'
  } else if (execRecord.status === 'completed') {
    verification_status = 'verified'
    verification_notes  = 'Execution pipeline confirms completion'
  } else if (execRecord.status === 'failed') {
    verification_status = 'failed'
    verification_notes  = 'Execution pipeline reports failure'
  } else {
    verification_status = 'unverified'
    verification_notes  = `Execution pipeline status: ${execRecord.status}`
  }

  return {
    execution_found:     !!execRecord,
    replay_available:    hasReplay,
    analysis_available:  hasAnalysis,
    verification_status,
    verification_notes,
    duration_ms,
  }
}

// ── Sync queue status ──────────────────────────────────────────────────────────

async function syncQueueStatus(
  activationId: string,
  newStatus: 'executing' | 'completed' | 'failed',
  failureReason?: string,
): Promise<void> {
  const key = `p16:queue:${activationId}`
  const existing = await memRead(key) as QueueRecord | null
  if (!existing) return
  const updated: QueueRecord = {
    ...existing,
    queue_status:  newStatus,
    started_at:    newStatus === 'executing' ? (existing.started_at ?? new Date().toISOString()) : existing.started_at,
    completed_at:  newStatus === 'completed' || newStatus === 'failed' ? new Date().toISOString() : existing.completed_at,
    failure_reason: failureReason ?? existing.failure_reason,
  }
  await memWrite(key, updated)
}

// ── Build executor records ──────────────────────────────────────────────────

async function buildExecutorRecords(): Promise<ExecutorRecord[]> {
  const queueJson = await fetchJson<{ records: QueueRecord[] }>('/api/founder/queue')
  const queueItems = queueJson?.records ?? []

  const gatewayLive = await isGatewayLive()
  const now = new Date().toISOString()
  const records: ExecutorRecord[] = []

  for (const q of queueItems) {
    const key      = `p17:executor:${q.queue_id}`
    const existing = await memRead(key) as ExecutorRecord | null

    // Preserve terminal states
    if (
      existing?.execution_status === 'completed' ||
      existing?.execution_status === 'failed'
    ) {
      records.push(existing)
      continue
    }

    const eligibility = canExecute(q)

    if (!eligibility.ok) {
      const blocked: ExecutorRecord = {
        execution_id:        existing?.execution_id ?? `exec-${q.queue_id}-${Date.now()}`,
        queue_id:            q.queue_id,
        activation_id:       q.activation_id,
        operation_id:        q.operation_id,
        operation_title:     q.operation_title,
        founder_mode:        q.founder_mode,
        execution_status:    'blocked',
        execution_reason:    eligibility.reason,
        verification_status: 'unverified',
        verification_notes:  null,
        replay_available:    false,
        analysis_available:  false,
        started_at:          existing?.started_at ?? null,
        completed_at:        null,
        duration_ms:         null,
        created_at:          existing?.created_at ?? now,
        queue_status_synced: q.queue_status,
      }
      await memWrite(key, blocked)
      records.push(blocked)
      continue
    }

    // Read execution pipeline state
    const pipeline = await readExecutionPipeline(q.operation_id)

    // Determine execution status
    let execution_status: ExecutionStatus = 'running'
    let execution_reason = eligibility.reason

    if (!gatewayLive) {
      execution_status = 'unverified'
      execution_reason = 'Gateway is not live — execution cannot be verified'
    } else if (pipeline.verification_status === 'verified') {
      execution_status = 'completed'
      // Sync queue to completed
      await syncQueueStatus(q.activation_id, 'completed')
    } else if (pipeline.verification_status === 'failed') {
      execution_status = 'failed'
      await syncQueueStatus(q.activation_id, 'failed', 'Execution pipeline reported failure')
    } else {
      // running / unverified — sync queue to executing
      await syncQueueStatus(q.activation_id, 'executing')
    }

    const record: ExecutorRecord = {
      execution_id:        existing?.execution_id ?? `exec-${q.queue_id}-${Date.now()}`,
      queue_id:            q.queue_id,
      activation_id:       q.activation_id,
      operation_id:        q.operation_id,
      operation_title:     q.operation_title,
      founder_mode:        q.founder_mode,
      execution_status,
      execution_reason,
      verification_status: !gatewayLive ? 'unverified' : pipeline.verification_status,
      verification_notes:  !gatewayLive
        ? 'Gateway offline — verification deferred'
        : pipeline.verification_notes,
      replay_available:    pipeline.replay_available,
      analysis_available:  pipeline.analysis_available,
      started_at:          existing?.started_at ?? (q.started_at ?? now),
      completed_at:        execution_status === 'completed' || execution_status === 'failed'
        ? (existing?.completed_at ?? now)
        : null,
      duration_ms:         pipeline.duration_ms,
      created_at:          existing?.created_at ?? now,
      queue_status_synced: q.queue_status,
    }

    await memWrite(key, record)
    records.push(record)
  }

  return records
}

// ── GET /api/founder/executor ───────────────────────────────────────────────

export async function GET() {
  try {
    const records = await buildExecutorRecords()

    const byStatus = (s: ExecutionStatus) => records.filter(r => r.execution_status === s)

    const running    = byStatus('running')
    const completed  = byStatus('completed')
    const failed     = byStatus('failed')
    const blocked    = byStatus('blocked')
    const unverified = byStatus('unverified')
    const pending    = byStatus('pending')

    // Top running: highest priority running then unverified
    const topRunning = [...running, ...unverified]
      .sort((a, b) => (b.started_at ?? '').localeCompare(a.started_at ?? ''))[0] ?? null

    return NextResponse.json({
      running:    running.length,
      completed:  completed.length,
      failed:     failed.length,
      blocked:    blocked.length,
      unverified: unverified.length,
      pending:    pending.length,
      top_running: topRunning,
      records,
      gateway_live: await isGatewayLive(),
      generated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[executor] GET error:', err)
    return NextResponse.json({ error: 'Executor engine error' }, { status: 500 })
  }
}

// ── POST /api/founder/executor ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { action?: string; queue_id?: string; failure_reason?: string }
    const { action, queue_id, failure_reason } = body

    if (!action || !queue_id) {
      return NextResponse.json({ error: 'action and queue_id required' }, { status: 400 })
    }

    const key      = `p17:executor:${queue_id}`
    const existing = await memRead(key) as ExecutorRecord | null

    if (!existing) {
      return NextResponse.json({ error: 'Executor record not found for this queue_id' }, { status: 404 })
    }

    if (action === 'retry') {
      // Delegate retry to queue route via internal fetch
      const retryRes = await fetch(`${baseUrl()}/api/founder/queue`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:        'retry',
          activation_id: existing.activation_id,
          failure_reason: failure_reason ?? 'Retried via executor',
        }),
        cache: 'no-store',
      })
      const retryJson = await retryRes.json()

      // Reset executor record to pending so it re-evaluates
      const reset: ExecutorRecord = {
        ...existing,
        execution_status:    'pending',
        execution_reason:    'Reset for retry',
        verification_status: 'pending',
        verification_notes:  null,
        started_at:          null,
        completed_at:        null,
        duration_ms:         null,
      }
      await memWrite(key, reset)
      return NextResponse.json({ ok: true, executor: reset, queue: retryJson })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    console.error('[executor] POST error:', err)
    return NextResponse.json({ error: 'Executor engine error' }, { status: 500 })
  }
}
