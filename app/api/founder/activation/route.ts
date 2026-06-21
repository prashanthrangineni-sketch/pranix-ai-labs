// app/api/founder/activation/route.ts
// S4 — Autonomous Execution Activation
// Reads dispatch records, evaluates mode-gated activation rules,
// and persists ActivationRecord objects to execution_memory.
// Does NOT perform write actions — connects to read-only execution pipeline only.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { DispatchRecord } from '@/app/api/founder/dispatch/route'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActivationStatus =
  | 'pending'
  | 'activated'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'blocked'

export interface ActivationRecord {
  activation_id:     string
  dispatch_id:       string
  operation_id:      string
  operation_title:   string
  founder_mode:      string
  activation_status: ActivationStatus
  activation_reason: string
  authority_status:  string
  governance_status: string
  dispatch_status:   string
  risk_score:        number
  priority_score:    number
  activated_at:      string | null
  completed_at:      string | null
  created_at:        string
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

// ── Activation evaluator ────────────────────────────────────────────────────

function evaluateActivation(dispatch: DispatchRecord): {
  status: ActivationStatus
  reason: string
} {
  const { founder_mode, dispatch_status, authority_status, governance_status, risk_score } = dispatch

  // Dispatch must be dispatched or queued to proceed
  if (dispatch_status === 'blocked') {
    return { status: 'blocked', reason: 'Dispatch is blocked — activation cannot proceed' }
  }
  if (dispatch_status === 'completed') {
    return { status: 'completed', reason: 'Dispatch already completed' }
  }
  if (dispatch_status === 'failed') {
    return { status: 'failed', reason: 'Dispatch failed — activation halted' }
  }

  switch (founder_mode) {
    case 'MODE_A':
      return {
        status: 'blocked',
        reason: 'MODE_A (Observer): autonomous activation is never permitted',
      }

    case 'MODE_B':
      // Requires explicit founder approval before activation
      return {
        status: 'pending',
        reason: 'MODE_B (Supervised): awaiting explicit founder approval to activate',
      }

    case 'MODE_C': {
      // Activate automatically when: authority authorized + governance approved + risk low
      if (authority_status !== 'authorized') {
        return {
          status: 'blocked',
          reason: `MODE_C requires authority authorization (current: ${authority_status})`,
        }
      }
      if (governance_status !== 'allowed') {
        return {
          status: 'blocked',
          reason: `MODE_C requires governance approval (current: ${governance_status})`,
        }
      }
      if (risk_score > 40) {
        return {
          status: 'blocked',
          reason: `MODE_C allows only low-risk operations — risk score ${risk_score}/100 exceeds threshold of 40`,
        }
      }
      return {
        status: 'activated',
        reason: 'Low-risk operation eligible for autonomous execution — all MODE_C gates satisfied',
      }
    }

    case 'MODE_D': {
      // Activate automatically when: governance approved + dispatch = dispatched
      if (governance_status === 'blocked') {
        return {
          status: 'blocked',
          reason: 'Governance policy blocks activation under MODE_D',
        }
      }
      if (dispatch_status !== 'dispatched') {
        return {
          status: 'pending',
          reason: `MODE_D activation requires dispatch status = dispatched (current: ${dispatch_status})`,
        }
      }
      if (governance_status === 'needs_approval') {
        return {
          status: 'pending',
          reason: 'MODE_D (Autonomous): governance review pending — activation queued',
        }
      }
      return {
        status: 'activated',
        reason: 'Governance-approved dispatch — autonomous activation authorised under MODE_D',
      }
    }

    default:
      return { status: 'blocked', reason: `Unknown founder mode: ${founder_mode}` }
  }
}

// ── Build activation records ──────────────────────────────────────────────────

async function buildActivationRecords(): Promise<ActivationRecord[]> {
  const dispatchJson = await fetchJson<{ records: DispatchRecord[] }>('/api/founder/dispatch')
  const dispatches   = dispatchJson?.records ?? []

  const now     = new Date().toISOString()
  const records: ActivationRecord[] = []

  for (const dispatch of dispatches) {
    const key      = `p15:activation:${dispatch.dispatch_id}`
    const existing = await memRead(key) as ActivationRecord | null

    // Preserve terminal states across reloads
    if (
      existing?.activation_status === 'completed' ||
      existing?.activation_status === 'failed'
    ) {
      records.push(existing)
      continue
    }

    const evaluation = evaluateActivation(dispatch)

    const activation_id = existing?.activation_id ?? `act-${dispatch.dispatch_id}-${Date.now()}`
    const record: ActivationRecord = {
      activation_id,
      dispatch_id:       dispatch.dispatch_id,
      operation_id:      dispatch.operation_id,
      operation_title:   dispatch.operation_title,
      founder_mode:      dispatch.founder_mode,
      activation_status: evaluation.status,
      activation_reason: evaluation.reason,
      authority_status:  dispatch.authority_status,
      governance_status: dispatch.governance_status,
      dispatch_status:   dispatch.dispatch_status,
      risk_score:        dispatch.risk_score,
      priority_score:    dispatch.priority_score,
      activated_at: evaluation.status === 'activated' || evaluation.status === 'executing'
        ? (existing?.activated_at ?? now)
        : null,
      completed_at:  existing?.completed_at ?? null,
      created_at:    existing?.created_at ?? now,
    }

    await memWrite(key, record)
    records.push(record)
  }

  return records
}

// ── GET /api/founder/activation ───────────────────────────────────────────────

export async function GET() {
  try {
    const records = await buildActivationRecords()

    const byStatus = (s: ActivationStatus) => records.filter(r => r.activation_status === s)

    const pending   = byStatus('pending')
    const activated = byStatus('activated')
    const executing = byStatus('executing')
    const completed = byStatus('completed')
    const failed    = byStatus('failed')
    const blocked   = byStatus('blocked')

    // Top active: highest priority activated then executing
    const topActive = [...activated, ...executing]
      .sort((a, b) => b.priority_score - a.priority_score)[0] ?? null

    return NextResponse.json({
      pending:    pending.length,
      activated:  activated.length,
      executing:  executing.length,
      completed:  completed.length,
      failed:     failed.length,
      blocked:    blocked.length,
      top_active: topActive,
      records,
      generated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[activation] GET error:', err)
    return NextResponse.json({ error: 'Activation engine error' }, { status: 500 })
  }
}

// ── POST /api/founder/activation ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { action?: string; dispatch_id?: string }
    const { action, dispatch_id } = body

    if (!action || !dispatch_id) {
      return NextResponse.json({ error: 'action and dispatch_id required' }, { status: 400 })
    }

    const key      = `p15:activation:${dispatch_id}`
    const existing = await memRead(key) as ActivationRecord | null

    if (!existing) {
      return NextResponse.json({ error: 'Activation record not found' }, { status: 404 })
    }

    if (action === 'activate_dispatch') {
      // Founder manually activates a pending record (MODE_B use-case)
      if (existing.founder_mode === 'MODE_A') {
        return NextResponse.json({ error: 'MODE_A does not permit activation' }, { status: 403 })
      }
      const updated: ActivationRecord = {
        ...existing,
        activation_status: 'activated',
        activation_reason: 'Manually activated by founder',
        activated_at:      new Date().toISOString(),
      }
      await memWrite(key, updated)
      return NextResponse.json({ ok: true, record: updated })
    }

    if (action === 'cancel_activation') {
      const cancelled: ActivationRecord = {
        ...existing,
        activation_status: 'blocked',
        activation_reason: 'Activation cancelled by founder',
        activated_at:      null,
      }
      await memWrite(key, cancelled)
      return NextResponse.json({ ok: true, record: cancelled })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    console.error('[activation] POST error:', err)
    return NextResponse.json({ error: 'Activation engine error' }, { status: 500 })
  }
}
