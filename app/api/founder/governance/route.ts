// app/api/founder/governance/route.ts
// P8 — Founder Governance Engine.
//
// GET  — returns all policies + governance evaluations for every queued operation
// POST — action: 'enable_policy' | 'disable_policy'
//
// Storage: execution_memory only.
// Keys:
//   p8:policy:<id>              — individual policy (seeded from defaults)
//   p8:governance:<operation_id>— evaluation result per op
//
// NO GitHub / Vercel / Supabase row writes.
// NO execution — pure read-only governance intelligence.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@/lib/supabase'
import { getControlPlane }          from '@/app/lib/control-plane'
import type { Operation }           from '@/app/api/founder/operations/route'

export const runtime    = 'nodejs'
export const dynamic    = 'force-dynamic'
export const revalidate = 0

const PROJECT     = 'pranix-dashboard'
const POL_PREFIX  = 'p8:policy:'
const GOV_PREFIX  = 'p8:governance:'
const TTL_MS      = 90 * 24 * 3600 * 1000  // 90 days for policies
const GOV_TTL_MS  = 30 * 24 * 3600 * 1000

// ── Types ─────────────────────────────────────────────────────────────────────
export type PolicyActionType =
  | 'read_only'
  | 'external_api'
  | 'paid_model'
  | 'repo_modification'
  | 'database_mutation'
  | 'production_deployment'

export interface Policy {
  policy_id:         string
  name:              string
  scope:             string
  action_type:       PolicyActionType
  approval_required: boolean
  max_risk:          'low' | 'medium' | 'high' | 'critical'
  max_cost:          number          // 0 = unlimited
  allowed_providers: string[]        // [] = all
  allowed_projects:  string[]        // [] = all
  enabled:           boolean
  description:       string
}

export interface GovernanceEvaluation {
  operation_id:     string
  operation_title:  string
  allowed:          boolean
  approval_required:boolean
  governing_policy: string          // policy_id
  policy_name:      string
  reason:           string
  verdict:          'allowed' | 'needs_approval' | 'blocked'
  evaluated_at:     string
}

export interface GovernanceResponse {
  policies:               Policy[]
  evaluations:            GovernanceEvaluation[]
  violations:             GovernanceEvaluation[]
  approval_required_count:number
  blocked_count:          number
  generated_at:           string
}

// ── Default policies ─────────────────────────────────────────────────────────
const DEFAULT_POLICIES: Policy[] = [
  {
    policy_id:         'policy_a',
    name:              'Read Only',
    scope:             'global',
    action_type:       'read_only',
    approval_required: false,
    max_risk:          'low',
    max_cost:          0,
    allowed_providers: [],
    allowed_projects:  [],
    enabled:           true,
    description:       'Read-only operations require no approval and are always permitted.',
  },
  {
    policy_id:         'policy_b',
    name:              'External API Usage',
    scope:             'global',
    action_type:       'external_api',
    approval_required: true,
    max_risk:          'medium',
    max_cost:          0,
    allowed_providers: [],
    allowed_projects:  [],
    enabled:           true,
    description:       'Any operation that calls an external API requires Founder approval.',
  },
  {
    policy_id:         'policy_c',
    name:              'Paid Model Usage',
    scope:             'global',
    action_type:       'paid_model',
    approval_required: true,
    max_risk:          'medium',
    max_cost:          0,
    allowed_providers: [],
    allowed_projects:  [],
    enabled:           true,
    description:       'Operations that use paid AI models must be approved first.',
  },
  {
    policy_id:         'policy_d',
    name:              'Repository Modification',
    scope:             'global',
    action_type:       'repo_modification',
    approval_required: true,
    max_risk:          'high',
    max_cost:          0,
    allowed_providers: [],
    allowed_projects:  [],
    enabled:           true,
    description:       'Any write to a GitHub repository requires explicit Founder approval.',
  },
  {
    policy_id:         'policy_e',
    name:              'Database Mutation',
    scope:             'global',
    action_type:       'database_mutation',
    approval_required: true,
    max_risk:          'high',
    max_cost:          0,
    allowed_providers: [],
    allowed_projects:  [],
    enabled:           true,
    description:       'Any database mutation outside execution_memory requires Founder approval.',
  },
  {
    policy_id:         'policy_f',
    name:              'Production Deployment',
    scope:             'global',
    action_type:       'production_deployment',
    approval_required: true,
    max_risk:          'critical',
    max_cost:          0,
    allowed_providers: [],
    allowed_projects:  [],
    enabled:           true,
    description:       'Production deployments are always gated by Founder approval.',
  },
]

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

// ── Load (or seed) policies ────────────────────────────────────────────────────
async function loadPolicies(): Promise<Policy[]> {
  const cp = getControlPlane()
  const { data } = await cp
    .from('execution_memory')
    .select('key, value')
    .eq('project', PROJECT)
    .like('key', `${POL_PREFIX}%`)
    .gt('expires_at', new Date().toISOString())
    .limit(20)

  if (!data || data.length === 0) {
    // First run — seed defaults into execution_memory
    const expires = new Date(Date.now() + TTL_MS).toISOString()
    for (const pol of DEFAULT_POLICIES) {
      await cp.from('execution_memory').upsert(
        { project: PROJECT, key: `${POL_PREFIX}${pol.policy_id}`, value: pol, expires_at: expires },
        { onConflict: 'project,key', ignoreDuplicates: true },
      )
    }
    return DEFAULT_POLICIES
  }

  // Merge stored with defaults (new defaults not yet in storage get added)
  const stored = new Map(data.map(r => [(r.value as Policy).policy_id, r.value as Policy]))
  const merged: Policy[] = DEFAULT_POLICIES.map(d => stored.get(d.policy_id) ?? d)
  return merged
}

// ── Classify operation to policy action_type ──────────────────────────────────────
function classifyOperation(op: Operation): PolicyActionType {
  const t = op.title.toLowerCase()
  const c = op.category

  // Production deployment signals
  if (t.includes('deploy') || t.includes('vercel') || t.includes('production') || t.includes('release'))
    return 'production_deployment'

  // Database mutation signals
  if (t.includes('database') || t.includes('schema') || t.includes('migrate') || t.includes('supabase'))
    return 'database_mutation'

  // Repository modification signals
  if (t.includes('github') || t.includes('commit') || t.includes('push') || t.includes('pr') ||
      t.includes('branch') || t.includes('repo') || t.includes('rotate') || t.includes('credential'))
    return 'repo_modification'

  // Paid model / provider signals
  if (t.includes('anthropic') || t.includes('openai') || t.includes('gemini') || t.includes('grok') ||
      t.includes('paid model') || c === 'provider')
    return 'paid_model'

  // External API signals
  if (t.includes('api key') || t.includes('enable') || t.includes('configure') ||
      t.includes('ollama') || t.includes('openrouter') || c === 'infrastructure')
    return 'external_api'

  // Audit, monitor, review — read-only
  if (t.includes('audit') || t.includes('monitor') || t.includes('verify') ||
      t.includes('check') || t.includes('review') || t.includes('replay') ||
      t.includes('read') || t.includes('inspect') || c === 'monitoring')
    return 'read_only'

  // Cleanup / workflow — external API (light touch)
  if (c === 'workflow' || c === 'cost' || t.includes('cleanup') || t.includes('stale'))
    return 'external_api'

  // Founder-scoped: treat as read-only
  if (c === 'founder') return 'read_only'

  // Default: external API (conservative)
  return 'external_api'
}

// ── Evaluate one operation against policies ─────────────────────────────────────
function evaluateOperation(op: Operation, policies: Policy[]): GovernanceEvaluation {
  const now = new Date().toISOString()
  const actionType = classifyOperation(op)

  // Find governing policy (first enabled policy matching action_type)
  const governing = policies.find(p => p.enabled && p.action_type === actionType)
    ?? policies.find(p => p.enabled && p.action_type === 'external_api')  // fallback
    ?? DEFAULT_POLICIES[1]  // Policy B hardcoded fallback

  // Risk gate: if op.risk_level exceeds policy.max_risk, block it
  const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 }
  const opRisk  = riskOrder[op.risk_level] ?? 1
  const polRisk = riskOrder[governing.max_risk] ?? 1
  const riskBlocked = opRisk > polRisk

  // Determine verdict
  let allowed           = true
  let approval_required = governing.approval_required
  let reason            = ''
  let verdict: GovernanceEvaluation['verdict'] = 'allowed'

  if (!governing.enabled) {
    allowed           = false
    approval_required = true
    verdict           = 'blocked'
    reason            = `Governing policy "${governing.name}" is disabled. Operation cannot proceed.`
  } else if (riskBlocked) {
    allowed           = false
    approval_required = true
    verdict           = 'blocked'
    reason            = `Operation risk (${op.risk_level}) exceeds policy maximum (${governing.max_risk}) under "${governing.name}".`
  } else if (approval_required) {
    verdict = 'needs_approval'
    reason  = `"${governing.name}" requires Founder approval before execution. No code or infra changes are made until approved.`
  } else {
    verdict = 'allowed'
    reason  = `"${governing.name}" permits this read-only operation without additional approval.`
  }

  return {
    operation_id:      op.operation_id,
    operation_title:   op.title,
    allowed,
    approval_required,
    governing_policy:  governing.policy_id,
    policy_name:       governing.name,
    reason,
    verdict,
    evaluated_at:      now,
  }
}

// ── Load all operations (ready + queued) ─────────────────────────────────────────
async function loadActiveOps(): Promise<Operation[]> {
  const cp = getControlPlane()
  const { data } = await cp
    .from('execution_memory')
    .select('key, value')
    .eq('project', PROJECT)
    .like('key', 'p6:operation:%')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(100)
  return (data ?? [])
    .map(r => r.value as Operation)
    .filter(o => o.status === 'ready' || o.status === 'queued')
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  if (!await assertFounder())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [policies, ops] = await Promise.all([
    loadPolicies(),
    loadActiveOps(),
  ])

  const evaluations: GovernanceEvaluation[] = []
  const cp      = getControlPlane()
  const expires = new Date(Date.now() + GOV_TTL_MS).toISOString()

  for (const op of ops) {
    const ev = evaluateOperation(op, policies)
    evaluations.push(ev)
    // Persist evaluation to execution_memory
    await cp.from('execution_memory').upsert(
      { project: PROJECT, key: `${GOV_PREFIX}${op.operation_id}`, value: ev, expires_at: expires },
      { onConflict: 'project,key', ignoreDuplicates: false },
    )
  }

  const violations = evaluations.filter(e => e.verdict === 'blocked')

  const response: GovernanceResponse = {
    policies,
    evaluations,
    violations,
    approval_required_count: evaluations.filter(e => e.verdict === 'needs_approval').length,
    blocked_count:           violations.length,
    generated_at:            new Date().toISOString(),
  }

  return NextResponse.json(response)
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!await assertFounder())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { action, policy_id } = body ?? {}

  if (!policy_id)
    return NextResponse.json({ error: 'policy_id required' }, { status: 400 })

  if (action !== 'enable_policy' && action !== 'disable_policy')
    return NextResponse.json({ error: 'action must be enable_policy or disable_policy' }, { status: 400 })

  const cp  = getControlPlane()
  const key = `${POL_PREFIX}${policy_id}`

  // Load current policy (stored or default)
  const { data: row } = await cp
    .from('execution_memory')
    .select('value')
    .eq('project', PROJECT)
    .eq('key', key)
    .maybeSingle()

  const base: Policy =
    (row?.value as Policy) ?? DEFAULT_POLICIES.find(p => p.policy_id === policy_id) ?? null
  if (!base)
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 })

  const updated: Policy = { ...base, enabled: action === 'enable_policy' }
  await cp.from('execution_memory').upsert(
    { project: PROJECT, key, value: updated,
      expires_at: new Date(Date.now() + TTL_MS).toISOString() },
    { onConflict: 'project,key', ignoreDuplicates: false },
  )

  return NextResponse.json({ ok: true, policy_id, enabled: updated.enabled })
}
