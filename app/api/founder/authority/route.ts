/**
 * app/api/founder/authority/route.ts
 * P10 — Execution Authority Layer
 *
 * Derives authorization for every queued operation by combining:
 *   • Governance evaluation  (P8 — /api/founder/governance)
 *   • Founder Mode           (P9 — /api/founder/modes)
 *   • Operation metadata     (P6 — /api/founder/operations)
 *
 * Storage: execution_memory only — keys  p10:authority:<operation_id>
 *
 * NO execution is triggered. Read-only authority determination.
 * NO GitHub / Supabase / Vercel / Doppler writes.
 */

import { NextRequest, NextResponse } from 'next/server'

// ────────────────────────────── Types

export type AuthorizationStatus = 'pending' | 'authorized' | 'expired' | 'blocked' | 'revoked'

export interface AuthorityRecord {
  authority_id:         string
  operation_id:         string
  operation_title:      string
  mode_id:              string
  governance_verdict:   'allowed' | 'needs_approval' | 'blocked'
  governance_policy:    string
  approval_status:      'not_required' | 'pending' | 'approved' | 'denied'
  authorization_status: AuthorizationStatus
  authorized_by:        'auto' | 'founder' | null
  authorized_at:        string | null
  expires_at:           string | null
  reason:               string
  evaluated_at:         string
}

export interface AuthoritySummary {
  pending:    AuthorityRecord[]
  authorized: AuthorityRecord[]
  blocked:    AuthorityRecord[]
  expired:    AuthorityRecord[]
  revoked:    AuthorityRecord[]
}

// ────────────────────────────── Helpers

function nowIso()              { return new Date().toISOString() }
function expiresIn(hours: number) {
  return new Date(Date.now() + hours * 3_600_000).toISOString()
}
function isExpired(iso: string | null): boolean {
  if (!iso) return false
  return new Date(iso).getTime() < Date.now()
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
const emKey      = (op_id: string) => `p10:authority:${op_id}`

async function readFromMemory(op_id: string): Promise<AuthorityRecord | null> {
  try {
    const j = await fetchJson(`${EM_BASE}?project=${EM_PROJECT}&key=${emKey(op_id)}`)
    return (j?.value as AuthorityRecord) ?? null
  } catch { return null }
}

async function writeToMemory(record: AuthorityRecord): Promise<void> {
  try {
    await fetch(`${appBase()}${EM_BASE}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        project:   EM_PROJECT,
        key:       emKey(record.operation_id),
        value:     record,
        ttl_hours: 48,
      }),
    })
  } catch { /* non-fatal */ }
}

// ────────────────────────────── Authority evaluation

function evaluateAuthority(params: {
  operation_id:     string
  operation_title:  string
  risk_level:       string
  execution_mode:   string
  mode_id:          string
  gov_verdict:      'allowed' | 'needs_approval' | 'blocked'
  gov_policy:       string
  persisted:        AuthorityRecord | null
}): AuthorityRecord {
  const { operation_id, operation_title, risk_level, execution_mode,
          mode_id, gov_verdict, gov_policy, persisted } = params

  const authority_id  = `auth_${operation_id}`
  const evaluated_at  = nowIso()
  const isReadOnly    = execution_mode === 'read_only' || risk_level === 'low'

  // Respect persisted revocation — survives reload
  if (persisted?.authorization_status === 'revoked') {
    return { ...persisted, evaluated_at }
  }
  // Respect persisted founder authorization; demote to expired if TTL passed
  if (persisted?.authorization_status === 'authorized') {
    if (isExpired(persisted.expires_at)) {
      return { ...persisted, authorization_status: 'expired', evaluated_at }
    }
    return { ...persisted, evaluated_at }
  }

  // Build base skeleton
  const base: Omit<AuthorityRecord, 'authorization_status' | 'approval_status' | 'authorized_by' | 'authorized_at' | 'expires_at' | 'reason'> = {
    authority_id, operation_id, operation_title,
    mode_id, governance_verdict: gov_verdict, governance_policy: gov_policy,
    evaluated_at,
  }

  // ── MODE_A: Founder Controlled — everything pending
  if (mode_id === 'MODE_A') {
    return {
      ...base,
      approval_status:      'pending',
      authorization_status: 'pending',
      authorized_by:  null, authorized_at: null, expires_at: null,
      reason: 'Founder Controlled mode — manual approval required for all operations.',
    }
  }

  // ── MODE_B: Approval Driven
  if (mode_id === 'MODE_B') {
    if (gov_verdict === 'blocked') {
      return {
        ...base,
        approval_status:      'denied',
        authorization_status: 'blocked',
        authorized_by:  null, authorized_at: null, expires_at: null,
        reason: `Blocked by governance policy "${gov_policy}". Cannot authorize in MODE_B.`,
      }
    }
    return {
      ...base,
      approval_status:      'pending',
      authorization_status: 'pending',
      authorized_by:  null, authorized_at: null, expires_at: null,
      reason: 'Founder approval required in MODE_B before execution can proceed.',
    }
  }

  // ── MODE_C: Semi Autonomous
  if (mode_id === 'MODE_C') {
    if (gov_verdict === 'blocked') {
      return {
        ...base,
        approval_status:      'denied',
        authorization_status: 'blocked',
        authorized_by:  null, authorized_at: null, expires_at: null,
        reason: `Blocked by governance policy "${gov_policy}".`,
      }
    }
    if (isReadOnly && gov_verdict === 'allowed') {
      return {
        ...base,
        approval_status:      'not_required',
        authorization_status: 'authorized',
        authorized_by:  'auto', authorized_at: evaluated_at, expires_at: expiresIn(8),
        reason: 'Read-only operation auto-authorized in MODE_C.',
      }
    }
    return {
      ...base,
      approval_status:      'pending',
      authorization_status: 'pending',
      authorized_by:  null, authorized_at: null, expires_at: null,
      reason: 'High-risk or write operation requires founder approval in MODE_C.',
    }
  }

  // ── MODE_D: Autonomous Operator — governance decides
  if (gov_verdict === 'blocked') {
    return {
      ...base,
      approval_status:      'denied',
      authorization_status: 'blocked',
      authorized_by:  null, authorized_at: null, expires_at: null,
      reason: `Blocked by governance policy "${gov_policy}" in MODE_D.`,
    }
  }
  if (gov_verdict === 'needs_approval') {
    return {
      ...base,
      approval_status:      'pending',
      authorization_status: 'pending',
      authorized_by:  null, authorized_at: null, expires_at: null,
      reason: `Governance requires approval (policy: "${gov_policy}") even in MODE_D.`,
    }
  }
  return {
    ...base,
    approval_status:      'not_required',
    authorization_status: 'authorized',
    authorized_by:  'auto', authorized_at: evaluated_at, expires_at: expiresIn(24),
    reason: 'Governance approved — auto-authorized by MODE_D autonomous operator.',
  }
}

// ────────────────────────────── GET /api/founder/authority

export async function GET() {
  const [opsData, govData, modesData] = await Promise.all([
    fetchJson('/api/founder/operations'),
    fetchJson('/api/founder/governance'),
    fetchJson('/api/founder/modes'),
  ])

  type RawOp = { operation_id: string; title: string; risk_level?: string; execution_mode?: string }
  const allOps: RawOp[] = [
    ...(opsData?.queued    ?? []),
    ...(opsData?.ready     ?? []),
    ...(opsData?.executing ?? []),
  ]

  type GovEntry = { operation_id: string; verdict: string; policy_name: string }
  const govMap = new Map<string, { verdict: 'allowed' | 'needs_approval' | 'blocked'; policy_name: string }>(
    (govData?.evaluations ?? []).map((e: GovEntry) => [
      e.operation_id,
      {
        verdict:     (e.verdict as 'allowed' | 'needs_approval' | 'blocked'),
        policy_name: e.policy_name ?? 'Unknown Policy',
      },
    ])
  )

  const mode_id: string = modesData?.active_mode?.mode_id ?? 'MODE_A'

  const records: AuthorityRecord[] = await Promise.all(
    allOps.map(async op => {
      const persisted = await readFromMemory(op.operation_id)
      const gov       = govMap.get(op.operation_id)
                     ?? { verdict: 'needs_approval' as const, policy_name: 'Unknown Policy' }
      const record    = evaluateAuthority({
        operation_id:    op.operation_id,
        operation_title: op.title,
        risk_level:      op.risk_level      ?? 'medium',
        execution_mode:  op.execution_mode  ?? 'standard',
        mode_id,
        gov_verdict:     gov.verdict,
        gov_policy:      gov.policy_name,
        persisted,
      })
      await writeToMemory(record)
      return record
    })
  )

  const summary: AuthoritySummary = {
    pending:    records.filter(r => r.authorization_status === 'pending'),
    authorized: records.filter(r => r.authorization_status === 'authorized'),
    blocked:    records.filter(r => r.authorization_status === 'blocked'),
    expired:    records.filter(r => r.authorization_status === 'expired'),
    revoked:    records.filter(r => r.authorization_status === 'revoked'),
  }

  return NextResponse.json({
    ...summary,
    mode_id,
    total:        records.length,
    evaluated_at: nowIso(),
  })
}

// ────────────────────────────── POST /api/founder/authority

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { action, operation_id } = body as { action: string; operation_id: string }

  if (!operation_id) {
    return NextResponse.json({ error: 'operation_id required' }, { status: 400 })
  }

  const existing = await readFromMemory(operation_id)
  if (!existing) {
    return NextResponse.json(
      { error: 'No authority record for operation. Call GET first to seed it.' },
      { status: 404 }
    )
  }

  if (action === 'authorize') {
    const updated: AuthorityRecord = {
      ...existing,
      authorization_status: 'authorized',
      approval_status:      'approved',
      authorized_by:        'founder',
      authorized_at:        nowIso(),
      expires_at:           expiresIn(24),
      reason:               'Manually authorized by Founder.',
      evaluated_at:         nowIso(),
    }
    await writeToMemory(updated)
    return NextResponse.json({ success: true, record: updated })
  }

  if (action === 'revoke') {
    const updated: AuthorityRecord = {
      ...existing,
      authorization_status: 'revoked',
      approval_status:      'denied',
      authorized_by:        null,
      authorized_at:        null,
      expires_at:           null,
      reason:               'Authorization revoked by Founder.',
      evaluated_at:         nowIso(),
    }
    await writeToMemory(updated)
    return NextResponse.json({ success: true, record: updated })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
