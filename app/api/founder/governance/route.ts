/**
 * P8 — Founder Governance Engine
 *
 * GET  /api/founder/governance
 *   → { policies, evaluations, approval_required_count, blocked_count }
 *
 * POST /api/founder/governance
 *   body: { action: 'enable_policy' | 'disable_policy', policy_id: string }
 *   → { ok, policy }
 *
 * Storage keys (execution_memory only — no Supabase writes, no GitHub, no Vercel):
 *   p8:policy:<id>           — Policy override (enabled/disabled)
 *   p8:governance:<op_id>    — Evaluation result per operation
 *
 * This module is READ-ONLY from the autonomous execution perspective.
 * No operations are executed here. This layer only evaluates permission.
 */

import { NextRequest, NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PolicyScope =
  | 'read_only'
  | 'external_api'
  | 'paid_model'
  | 'repo_modification'
  | 'database_mutation'
  | 'production_deployment'

export type GovernanceVerdict = 'allowed' | 'needs_approval' | 'blocked'

export interface Policy {
  policy_id:         string
  name:              string
  description:       string
  scope:             PolicyScope
  action_type:       string
  approval_required: boolean
  max_risk:          'low' | 'medium' | 'high' | 'critical'
  max_cost:          number         // USD ceiling per operation, 0 = no limit
  allowed_providers: string[]       // empty = all allowed
  allowed_projects:  string[]       // empty = all allowed
  enabled:           boolean
}

export interface GovernanceEvaluation {
  operation_id:    string
  operation_title: string
  verdict:         GovernanceVerdict
  approval_required: boolean
  governing_policy: string          // policy_id
  policy_name:     string
  reason:          string
  evaluated_at:    string
}

// ─── Default Policies (A-F, spec-compliant) ───────────────────────────────────

const DEFAULT_POLICIES: Policy[] = [
  {
    policy_id:         'pol_A',
    name:              'Read Only',
    description:       'Operations that only read data require no approval.',
    scope:             'read_only',
    action_type:       'read',
    approval_required: false,
    max_risk:          'low',
    max_cost:          0,
    allowed_providers: [],
    allowed_projects:  [],
    enabled:           true,
  },
  {
    policy_id:         'pol_B',
    name:              'External API Usage',
    description:       'Calling any third-party or external API requires founder approval.',
    scope:             'external_api',
    action_type:       'api_call',
    approval_required: true,
    max_risk:          'medium',
    max_cost:          10,
    allowed_providers: [],
    allowed_projects:  [],
    enabled:           true,
  },
  {
    policy_id:         'pol_C',
    name:              'Paid Model Usage',
    description:       'Using a paid inference model (e.g. Anthropic, OpenAI) requires approval.',
    scope:             'paid_model',
    action_type:       'inference',
    approval_required: true,
    max_risk:          'medium',
    max_cost:          5,
    allowed_providers: ['ollama'],
    allowed_projects:  [],
    enabled:           true,
  },
  {
    policy_id:         'pol_D',
    name:              'Repository Modification',
    description:       'Any write to a GitHub repository requires founder approval.',
    scope:             'repo_modification',
    action_type:       'github_write',
    approval_required: true,
    max_risk:          'high',
    max_cost:          0,
    allowed_providers: [],
    allowed_projects:  [],
    enabled:           true,
  },
  {
    policy_id:         'pol_E',
    name:              'Database Mutation',
    description:       'Writes, inserts, or deletes against any Supabase project require approval.',
    scope:             'database_mutation',
    action_type:       'supabase_write',
    approval_required: true,
    max_risk:          'high',
    max_cost:          0,
    allowed_providers: [],
    allowed_projects:  [],
    enabled:           true,
  },
  {
    policy_id:         'pol_F',
    name:              'Production Deployment',
    description:       'Any Vercel deployment to production requires founder approval.',
    scope:             'production_deployment',
    action_type:       'vercel_deploy',
    approval_required: true,
    max_risk:          'critical',
    max_cost:          0,
    allowed_providers: [],
    allowed_projects:  [],
    enabled:           true,
  },
]

// ─── Scope classifier: maps operation keywords → PolicyScope ─────────────────

const SCOPE_KEYWORDS: { scope: PolicyScope; keywords: string[] }[] = [
  {
    scope:    'production_deployment',
    keywords: ['deploy', 'deployment', 'production', 'vercel', 'release', 'go live'],
  },
  {
    scope:    'repo_modification',
    keywords: ['github', 'commit', 'push', 'pull request', 'patch', 'branch', 'repository', 'repo write', 'apply patch'],
  },
  {
    scope:    'database_mutation',
    keywords: ['supabase', 'database', 'insert', 'delete', 'update row', 'migration', 'db write', 'sql write'],
  },
  {
    scope:    'paid_model',
    keywords: ['anthropic', 'claude', 'openai', 'gpt', 'gemini', 'paid model', 'premium model'],
  },
  {
    scope:    'external_api',
    keywords: ['api', 'doppler', 'provider', 'enable provider', 'enable anthropic', 'external', 'webhook', 'integration'],
  },
  {
    scope:    'read_only',
    keywords: ['read', 'list', 'fetch', 'get', 'view', 'inspect', 'query', 'search', 'scan', 'check', 'status'],
  },
]

function classifyScope(title: string, category?: string): PolicyScope {
  const text = `${title} ${category ?? ''}`.toLowerCase()
  for (const { scope, keywords } of SCOPE_KEYWORDS) {
    if (keywords.some(k => text.includes(k))) return scope
  }
  // Default: treat unknowns as external_api (approval_required = true — safer)
  return 'external_api'
}

function findGoverningPolicy(scope: PolicyScope, policies: Policy[]): Policy {
  const match = policies.find(p => p.scope === scope && p.enabled)
  // If the matching policy is disabled, fall back to strictest default
  return match ?? DEFAULT_POLICIES.find(p => p.scope === scope) ?? DEFAULT_POLICIES[1]
}

// ─── Execution-memory helpers (no Supabase, no GitHub) ───────────────────────

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL

function baseUrl(): string {
  if (!BASE) return ''
  return BASE.startsWith('http') ? BASE : `https://${BASE}`
}

async function memRead(key: string): Promise<Record<string, unknown> | null> {
  try {
    const url = `${baseUrl()}/api/founder/execution-memory?key=${encodeURIComponent(key)}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const j = await res.json()
    return (j?.value ?? null) as Record<string, unknown> | null
  } catch {
    return null
  }
}

async function memWrite(key: string, value: Record<string, unknown>): Promise<void> {
  try {
    const url = `${baseUrl()}/api/founder/execution-memory`
    await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key, value }),
    })
  } catch {
    // non-fatal
  }
}

// ─── Load policies (merge defaults + any founder overrides in exec-memory) ────

async function loadPolicies(): Promise<Policy[]> {
  const policies = structuredClone(DEFAULT_POLICIES)
  await Promise.all(
    policies.map(async (pol) => {
      const override = await memRead(`p8:policy:${pol.policy_id}`)
      if (override && typeof override.enabled === 'boolean') {
        pol.enabled = override.enabled
      }
    })
  )
  return policies
}

// ─── Evaluate a single operation ─────────────────────────────────────────────

interface OperationInput {
  operation_id: string
  title:        string
  category?:    string
  risk_level?:  string
  provider?:    string
  project?:     string
}

function evaluateOperation(
  op: OperationInput,
  policies: Policy[],
): GovernanceEvaluation {
  const scope   = classifyScope(op.title, op.category)
  const policy  = findGoverningPolicy(scope, policies)

  // Determine verdict
  let verdict: GovernanceVerdict = 'allowed'
  let reason = `Operation falls under the "${policy.name}" policy. No approval required.`

  if (!policy.enabled) {
    verdict = 'blocked'
    reason  = `Policy "${policy.name}" is currently disabled. Operation cannot proceed.`
  } else if (policy.approval_required) {
    verdict = 'needs_approval'
    reason  = `Policy "${policy.name}" requires founder approval before this operation can execute.`
  } else if (op.risk_level === 'critical' || op.risk_level === 'high') {
    verdict = 'needs_approval'
    reason  = `Risk level is ${op.risk_level}. Elevated risk triggers approval requirement regardless of policy defaults.`
  }

  // Provider restriction check
  if (
    policy.allowed_providers.length > 0 &&
    op.provider &&
    !policy.allowed_providers.includes(op.provider.toLowerCase())
  ) {
    verdict = 'blocked'
    reason  = `Provider "${op.provider}" is not in the allowed list for policy "${policy.name}".`
  }

  return {
    operation_id:      op.operation_id,
    operation_title:   op.title,
    verdict,
    approval_required: policy.approval_required,
    governing_policy:  policy.policy_id,
    policy_name:       policy.name,
    reason,
    evaluated_at:      new Date().toISOString(),
  }
}

// ─── Pull live operations from the operations API ────────────────────────────

async function fetchActiveOperations(): Promise<OperationInput[]> {
  try {
    const url = `${baseUrl()}/api/founder/operations`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    const j = await res.json()
    const ops = [
      ...(j?.queued    ?? []),
      ...(j?.ready     ?? []),
      ...(j?.executing ?? []),
    ] as Array<{
      operation_id: string
      title: string
      category?: string
      risk_level?: string
      provider?: string
      project?: string
    }>
    return ops
  } catch {
    return []
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const [policies, operations] = await Promise.all([
    loadPolicies(),
    fetchActiveOperations(),
  ])

  const evaluations: GovernanceEvaluation[] = await Promise.all(
    operations.map(async (op) => {
      const cached = await memRead(`p8:governance:${op.operation_id}`)
      if (cached && (cached as unknown as GovernanceEvaluation).verdict) {
        return cached as unknown as GovernanceEvaluation
      }
      const ev = evaluateOperation(op, policies)
      await memWrite(`p8:governance:${op.operation_id}`, ev as unknown as Record<string, unknown>)
      return ev
    })
  )

  const approval_required_count = evaluations.filter(e => e.verdict === 'needs_approval').length
  const blocked_count           = evaluations.filter(e => e.verdict === 'blocked').length

  // Violations = blocked + needs_approval
  const violations = evaluations.filter(e => e.verdict !== 'allowed')

  return NextResponse.json({
    policies,
    evaluations,
    violations,
    approval_required_count,
    blocked_count,
  })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { action?: string; policy_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { action, policy_id } = body

  if (!action || !policy_id) {
    return NextResponse.json({ error: 'action and policy_id are required' }, { status: 400 })
  }

  const validPolicyId = DEFAULT_POLICIES.find(p => p.policy_id === policy_id)
  if (!validPolicyId) {
    return NextResponse.json({ error: `Unknown policy_id: ${policy_id}` }, { status: 404 })
  }

  if (action !== 'enable_policy' && action !== 'disable_policy') {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  const enabled = action === 'enable_policy'
  await memWrite(`p8:policy:${policy_id}`, { enabled, updated_at: new Date().toISOString() })

  const updatedPolicy = { ...validPolicyId, enabled }
  return NextResponse.json({ ok: true, policy: updatedPolicy })
}
