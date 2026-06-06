// app/api/founder/queue/route.ts
// S5 — Durable Queue & Retry System
// Reads activation records, enqueues eligible work, manages lease lifecycle,
// and tracks retries through dead-letter. No execution is triggered here —
// queue is the bridge between activation and future execution.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { ActivationRecord } from '@/app/api/founder/activation/route'

// ── Types ───────────────────────────────────────────────────────────────────

export type QueueStatus =
  | 'queued'
  | 'leased'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'dead_letter'

export interface QueueRecord {
  queue_id:         string
  activation_id:    string
  operation_id:     string
  operation_title:  string
  founder_mode:     string
  queue_status:     QueueStatus
  retry_count:      number
  max_retries:      number
  leased_by:        string | null
  leased_at:        string | null
  lease_expires_at: string | null
  queued_at:        string
  started_at:       string | null
  completed_at:     string | null
  failure_reason:   string | null
  priority_score:   number
  risk_score:       number
}

// ── Internal fetch / memory helpers ────────────────────────────────────────

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

// ── Eligibility check ───────────────────────────────────────────────────────

function canEnqueue(act: ActivationRecord): { ok: boolean; reason: string } {
  if (act.founder_mode === 'MODE_A') {
    return { ok: false, reason: 'MODE_A never enqueues' }
  }
  if (act.activation_status !== 'activated' && act.activation_status !== 'executing') {
    return { ok: false, reason: `Activation status is ${act.activation_status} — must be activated or executing` }
  }
  return { ok: true, reason: 'Eligible for queue' }
}

// ── Lease helpers ───────────────────────────────────────────────────────────

const LEASE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function isLeaseExpired(rec: QueueRecord): boolean {
  if (!rec.lease_expires_at) return true
  return Date.now() > new Date(rec.lease_expires_at).getTime()
}

function applyLease(rec: QueueRecord, leasedBy: string): QueueRecord {
  const now = new Date().toISOString()
  return {
    ...rec,
    queue_status:     'leased',
    leased_by:        leasedBy,
    leased_at:        now,
    lease_expires_at: new Date(Date.now() + LEASE_TTL_MS).toISOString(),
    started_at:       rec.started_at ?? now,
  }
}

function releaseLease(rec: QueueRecord): QueueRecord {
  return {
    ...rec,
    queue_status:     'queued',
    leased_by:        null,
    leased_at:        null,
    lease_expires_at: null,
  }
}

// ── Build queue records ─────────────────────────────────────────────────────

async function buildQueueRecords(): Promise<QueueRecord[]> {
  const activationJson = await fetchJson<{ records: ActivationRecord[] }>('/api/founder/activation')
  const activations    = activationJson?.records ?? []

  const now     = new Date().toISOString()
  const records: QueueRecord[] = []

  for (const act of activations) {
    const key      = `p16:queue:${act.activation_id}`
    const existing = await memRead(key) as QueueRecord | null

    // Preserve terminal states
    if (
      existing?.queue_status === 'completed' ||
      existing?.queue_status === 'dead_letter'
    ) {
      records.push(existing)
      continue
    }

    // Re-check expired leases → fall back to queued
    if (existing?.queue_status === 'leased' && isLeaseExpired(existing)) {
      const released: QueueRecord = { ...releaseLease(existing) }
      await memWrite(key, released)
      records.push(released)
      continue
    }

    // If already has a live record, refresh eligibility but preserve state
    if (existing) {
      records.push(existing)
      continue
    }

    // New record — check eligibility
    const eligibility = canEnqueue(act)
    const queue_status: QueueStatus = eligibility.ok ? 'queued' : 'failed'

    const record: QueueRecord = {
      queue_id:         `q-${act.activation_id}-${Date.now()}`,
      activation_id:    act.activation_id,
      operation_id:     act.operation_id,
      operation_title:  act.operation_title,
      founder_mode:     act.founder_mode,
      queue_status,
      retry_count:      0,
      max_retries:      3,
      leased_by:        null,
      leased_at:        null,
      lease_expires_at: null,
      queued_at:        now,
      started_at:       null,
      completed_at:     null,
      failure_reason:   eligibility.ok ? null : eligibility.reason,
      priority_score:   act.priority_score,
      risk_score:       act.risk_score,
    }

    await memWrite(key, record)
    records.push(record)
  }

  return records
}

// ── GET /api/founder/queue ──────────────────────────────────────────────────

export async function GET() {
  try {
    const records = await buildQueueRecords()

    const byStatus = (s: QueueStatus) => records.filter(r => r.queue_status === s)

    const queued      = byStatus('queued')
    const leased      = byStatus('leased')
    const executing   = byStatus('executing')
    const completed   = byStatus('completed')
    const failed      = byStatus('failed')
    const dead_letter = byStatus('dead_letter')

    // Top queue item: highest priority queued then leased
    const topItem = [...queued, ...leased]
      .sort((a, b) => b.priority_score - a.priority_score)[0] ?? null

    return NextResponse.json({
      queued:      queued.length,
      leased:      leased.length,
      executing:   executing.length,
      completed:   completed.length,
      failed:      failed.length,
      dead_letter: dead_letter.length,
      top_item:    topItem,
      records,
      generated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[queue] GET error:', err)
    return NextResponse.json({ error: 'Queue engine error' }, { status: 500 })
  }
}

// ── POST /api/founder/queue ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      action?:      string
      activation_id?: string
      leased_by?:   string
      failure_reason?: string
    }
    const { action, activation_id, leased_by, failure_reason } = body

    if (!action || !activation_id) {
      return NextResponse.json({ error: 'action and activation_id required' }, { status: 400 })
    }

    const key      = `p16:queue:${activation_id}`
    const existing = await memRead(key) as QueueRecord | null

    if (!existing) {
      return NextResponse.json({ error: 'Queue record not found' }, { status: 404 })
    }

    if (action === 'lease') {
      // Reject if already leased and lease is live
      if (existing.queue_status === 'leased' && !isLeaseExpired(existing)) {
        return NextResponse.json({ error: 'Record is already leased', leased_by: existing.leased_by }, { status: 409 })
      }
      const updated = applyLease(existing, leased_by ?? 'system')
      await memWrite(key, updated)
      return NextResponse.json({ ok: true, record: updated })
    }

    if (action === 'release') {
      const updated = releaseLease(existing)
      await memWrite(key, updated)
      return NextResponse.json({ ok: true, record: updated })
    }

    if (action === 'renew') {
      if (existing.queue_status !== 'leased') {
        return NextResponse.json({ error: 'Cannot renew — record is not leased' }, { status: 400 })
      }
      const updated: QueueRecord = {
        ...existing,
        lease_expires_at: new Date(Date.now() + LEASE_TTL_MS).toISOString(),
      }
      await memWrite(key, updated)
      return NextResponse.json({ ok: true, record: updated })
    }

    if (action === 'retry') {
      const newCount = (existing.retry_count ?? 0) + 1
      const isDead   = newCount > (existing.max_retries ?? 3)
      const updated: QueueRecord = {
        ...existing,
        queue_status:   isDead ? 'dead_letter' : 'queued',
        retry_count:    newCount,
        leased_by:      null,
        leased_at:      null,
        lease_expires_at: null,
        failure_reason: failure_reason ?? existing.failure_reason ?? 'Unknown failure',
      }
      await memWrite(key, updated)
      return NextResponse.json({ ok: true, record: updated })
    }

    if (action === 'dead_letter') {
      const updated: QueueRecord = {
        ...existing,
        queue_status:   'dead_letter',
        failure_reason: failure_reason ?? 'Manually moved to dead letter',
        leased_by:      null,
        leased_at:      null,
        lease_expires_at: null,
      }
      await memWrite(key, updated)
      return NextResponse.json({ ok: true, record: updated })
    }

    if (action === 'enqueue') {
      // Force-re-enqueue a failed or dead_letter record
      if (existing.founder_mode === 'MODE_A') {
        return NextResponse.json({ error: 'MODE_A cannot be enqueued' }, { status: 403 })
      }
      const updated: QueueRecord = {
        ...existing,
        queue_status:     'queued',
        retry_count:      existing.retry_count,
        leased_by:        null,
        leased_at:        null,
        lease_expires_at: null,
        failure_reason:   null,
      }
      await memWrite(key, updated)
      return NextResponse.json({ ok: true, record: updated })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    console.error('[queue] POST error:', err)
    return NextResponse.json({ error: 'Queue engine error' }, { status: 500 })
  }
}
