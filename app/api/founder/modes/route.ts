/**
 * P9 — Founder Modes Engine
 *
 * GET  /api/founder/modes
 *   → { active_mode, modes }
 *
 * POST /api/founder/modes
 *   body: { action: 'set_mode', mode_id: string }
 *   → { ok, active_mode }
 *
 * Storage: execution_memory only (no Supabase, no GitHub, no Vercel, no Doppler)
 *   Key: p9:founder_mode  →  { mode_id, set_at }
 *
 * NO execution happens here. This layer only defines autonomy boundaries.
 */

import { NextRequest, NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModeId = 'MODE_A' | 'MODE_B' | 'MODE_C' | 'MODE_D'

export interface FounderMode {
  mode_id:                    ModeId
  name:                       string
  description:                string
  execution_allowed:          boolean
  auto_execute_read_only:     boolean
  auto_execute_low_risk:      boolean
  founder_approval_required:  boolean
  enabled:                    boolean
  capabilities:               string[]
  restrictions:               string[]
}

// ─── Mode definitions ─────────────────────────────────────────────────────────

const MODES: FounderMode[] = [
  {
    mode_id:                   'MODE_A',
    name:                      'Founder Controlled',
    description:               'No autonomous execution. Everything requires founder decision. Plans and recommendations only.',
    execution_allowed:         false,
    auto_execute_read_only:    false,
    auto_execute_low_risk:     false,
    founder_approval_required: true,
    enabled:                   true,
    capabilities:              ['Recommendations', 'Plans', 'Replay', 'Read-only inspection'],
    restrictions:              ['No execution', 'No MCP writes', 'No deployments', 'No DB mutations'],
  },
  {
    mode_id:                   'MODE_B',
    name:                      'Approval Driven',
    description:               'Read-only MCP tools run automatically. Any execution step requires explicit founder approval first.',
    execution_allowed:         true,
    auto_execute_read_only:    false,
    auto_execute_low_risk:     false,
    founder_approval_required: true,
    enabled:                   true,
    capabilities:              ['MCP Reads', 'Replay', 'Verification', 'Recommendations'],
    restrictions:              ['No writes', 'No deployments', 'Approval required before execution'],
  },
  {
    mode_id:                   'MODE_C',
    name:                      'Semi Autonomous',
    description:               'Read-only operations run automatically. Low-risk operations execute without approval. High-risk requires founder sign-off.',
    execution_allowed:         true,
    auto_execute_read_only:    true,
    auto_execute_low_risk:     true,
    founder_approval_required: false,
    enabled:                   true,
    capabilities:              ['Auto read-only execution', 'Auto low-risk execution', 'MCP reads + writes (low risk)', 'Recommendations'],
    restrictions:              ['High-risk requires approval', 'No production deployments without approval'],
  },
  {
    mode_id:                   'MODE_D',
    name:                      'Autonomous Operator',
    description:               'Governance and Scheduler decide what runs. Founder reviews outcomes, not individual operations.',
    execution_allowed:         true,
    auto_execute_read_only:    true,
    auto_execute_low_risk:     true,
    founder_approval_required: false,
    enabled:                   true,
    capabilities:              ['Full governance-gated execution', 'Scheduler-driven prioritisation', 'Auto read + low-risk writes', 'Outcome-only review'],
    restrictions:              ['Governance policy violations still block', 'Production deployments still require approval'],
  },
]

// ─── Default mode ─────────────────────────────────────────────────────────────
// Pranix starts in MODE_A (maximum founder control) until explicitly changed.
const DEFAULT_MODE_ID: ModeId = 'MODE_A'

// ─── Execution-memory helpers ─────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL

function baseUrl(): string {
  if (!BASE) return ''
  return BASE.startsWith('http') ? BASE : `https://${BASE}`
}

async function memRead(key: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `${baseUrl()}/api/founder/execution-memory?key=${encodeURIComponent(key)}`,
      { cache: 'no-store' },
    )
    if (!res.ok) return null
    const j = await res.json()
    return (j?.value ?? null) as Record<string, unknown> | null
  } catch {
    return null
  }
}

async function memWrite(key: string, value: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${baseUrl()}/api/founder/execution-memory`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key, value }),
    })
  } catch {
    // non-fatal
  }
}

// ─── Load active mode ─────────────────────────────────────────────────────────

async function loadActiveMode(): Promise<FounderMode> {
  const stored = await memRead('p9:founder_mode')
  const modeId = (stored?.mode_id as ModeId | undefined) ?? DEFAULT_MODE_ID
  return MODES.find(m => m.mode_id === modeId) ?? MODES[0]
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const active_mode = await loadActiveMode()
  return NextResponse.json({ active_mode, modes: MODES })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { action?: string; mode_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { action, mode_id } = body

  if (action !== 'set_mode') {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  const target = MODES.find(m => m.mode_id === mode_id)
  if (!target) {
    return NextResponse.json({ error: `Unknown mode_id: ${mode_id}` }, { status: 404 })
  }

  await memWrite('p9:founder_mode', {
    mode_id:  target.mode_id,
    set_at:   new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, active_mode: target })
}
