// app/api/founder/operations/route.ts
// P6 — Autonomous Operations Queue.
// GET  — returns all operations grouped by status
// POST — action: 'create' | 'cancel'
//
// Storage: execution_memory only.
// Key format: p6:operation:<operation_id>     — individual op
//             p6:ops_index                     — sorted list of IDs (for fast listing)
//
// NO GitHub / Vercel / Supabase row writes.
// Operations are work-items only — they do not trigger execution.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@/lib/supabase'
import { getControlPlane }          from '@/app/lib/control-plane'

export const runtime    = 'nodejs'
export const dynamic    = 'force-dynamic'
export const revalidate = 0

const PROJECT   = 'pranix-dashboard'
const OP_PREFIX = 'p6:operation:'
const OP_INDEX  = 'p6:ops_index'
const TTL_MS    = 30 * 24 * 3600 * 1000  // 30 days

// ── Types ─────────────────────────────────────────────────────────────────────
export type OpStatus =
  | 'queued' | 'ready' | 'executing' | 'completed' | 'failed' | 'blocked'

export type OpCategory =
  | 'monitoring' | 'deployment' | 'infrastructure' | 'security'
  | 'provider'   | 'workflow'   | 'cost'           | 'founder'

export interface Operation {
  operation_id:      string
  recommendation_id: string
  title:             string
  description:       string
  category:          OpCategory
  risk_level:        'low' | 'medium' | 'high' | 'critical'
  status:            OpStatus
  created_at:        string
  approved_at:       string
  execution_mode:    'manual' | 'assisted' | 'autonomous'
  source_evidence:   string
  replay_id:         string | null
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

// ── Deterministic operation ID from rec_id ────────────────────────────────────
function makeOpId(recommendationId: string): string {
  let h = 5381
  const s = `op:${recommendationId}`
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i)
  return `op_${(h >>> 0).toString(16).padStart(8, '0')}`
}

// ── Map recommendation category → operation title ─────────────────────────────
function opTitleFromRec(recTitle: string, recCategory: string): string {
  // Turn recommendation titles into actionable operation titles.
  const t = recTitle.toLowerCase()
  if (t.includes('anthropic'))    return 'Enable Anthropic provider'
  if (t.includes('openai'))       return 'Enable OpenAI provider'
  if (t.includes('gemini'))       return 'Enable Gemini provider'
  if (t.includes('ollama'))       return 'Configure Ollama endpoint'
  if (t.includes('openrouter'))   return 'Enable OpenRouter fallback'
  if (t.includes('github'))       return 'Rotate GitHub credentials'
  if (t.includes('rotate'))       return 'Rotate expired credential'
  if (t.includes('offline'))      return `Restore ${recTitle.split(' ').slice(-1)[0]} provider`
  if (t.includes('api key'))      return `Add missing API key`
  if (t.includes('deployment'))   return 'Fix deployment configuration'
  if (t.includes('monitor'))      return 'Enable deployment monitoring'
  if (t.includes('stale'))        return 'Clear stale task queue'
  if (t.includes('integrity'))    return 'Re-run integrity verification'
  if (t.includes('blocked'))      return 'Unblock pending task'
  if (t.includes('approval'))     return 'Process stale approvals'
  return `Act on: ${recTitle.slice(0, 60)}`
}

// ── Load all operations ───────────────────────────────────────────────────────
async function loadAllOps(): Promise<Operation[]> {
  const cp = getControlPlane()
  const { data } = await cp
    .from('execution_memory')
    .select('key, value, created_at')
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

  const ops = await loadAllOps()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  const grouped = {
    queued:    ops.filter(o => o.status === 'queued'),
    ready:     ops.filter(o => o.status === 'ready'),
    executing: ops.filter(o => o.status === 'executing'),
    completed: ops.filter(o => o.status === 'completed' &&
                               new Date(o.approved_at).getTime() >= todayStart),
    failed:    ops.filter(o => o.status === 'failed'),
    blocked:   ops.filter(o => o.status === 'blocked'),
    history:   ops.filter(o => ['completed', 'failed', 'blocked'].includes(o.status)),
  }

  return NextResponse.json({
    ...grouped,
    total:        ops.length,
    generated_at: now.toISOString(),
  })
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!await assertFounder())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { action } = body ?? {}

  // ── action: create ─────────────────────────────────────────────────────────
  if (action === 'create') {
    const {
      recommendation_id, title: recTitle, category, risk_level, summary, source_task_id,
    } = body

    if (!recommendation_id)
      return NextResponse.json({ error: 'recommendation_id required' }, { status: 400 })

    const cp  = getControlPlane()
    const now = new Date().toISOString()
    const operation_id = makeOpId(recommendation_id)

    // Idempotent — if already exists, return it
    const { data: existing } = await cp
      .from('execution_memory')
      .select('value')
      .eq('project', PROJECT)
      .eq('key', `${OP_PREFIX}${operation_id}`)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ ok: true, operation_id, created: false, operation: existing.value })
    }

    const op: Operation = {
      operation_id,
      recommendation_id,
      title:          opTitleFromRec(recTitle ?? '', category ?? 'workflow'),
      description:    summary ?? `Operational work item for recommendation: ${recTitle}`,
      category:       (category as OpCategory) ?? 'workflow',
      risk_level:     risk_level ?? 'medium',
      status:         'ready',
      created_at:     now,
      approved_at:    now,
      execution_mode: 'manual',
      source_evidence: source_task_id ?? '',
      replay_id:      source_task_id ?? null,
    }

    await cp
      .from('execution_memory')
      .upsert(
        { project: PROJECT, key: `${OP_PREFIX}${operation_id}`, value: op,
          expires_at: new Date(Date.now() + TTL_MS).toISOString() },
        { onConflict: 'project,key', ignoreDuplicates: false },
      )

    return NextResponse.json({ ok: true, operation_id, created: true, operation: op })
  }

  // ── action: cancel ─────────────────────────────────────────────────────────
  if (action === 'cancel') {
    const { operation_id } = body
    if (!operation_id)
      return NextResponse.json({ error: 'operation_id required' }, { status: 400 })

    const cp = getControlPlane()
    const key = `${OP_PREFIX}${operation_id}`

    const { data: row } = await cp
      .from('execution_memory')
      .select('value')
      .eq('project', PROJECT)
      .eq('key', key)
      .maybeSingle()
    if (!row) return NextResponse.json({ error: 'Operation not found' }, { status: 404 })

    const updated: Operation = { ...(row.value as Operation), status: 'blocked' }
    await cp
      .from('execution_memory')
      .upsert(
        { project: PROJECT, key, value: updated,
          expires_at: new Date(Date.now() + TTL_MS).toISOString() },
        { onConflict: 'project,key', ignoreDuplicates: false },
      )

    return NextResponse.json({ ok: true, operation_id, status: 'blocked' })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
