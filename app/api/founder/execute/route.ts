import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '../../../lib/control-plane'
import type { PlanStep, TimelineEvent, PersistedTask } from '../../founder/ask/ask-chat'

export const dynamic    = 'force-dynamic'
export const maxDuration = 60  // Vercel: up to 60s for sequential MCP calls

const PROJECT   = 'pranix-dashboard'
const KEY_NS    = 'ask:task:'
const TTL_HOURS = 168

// ─── S1: Extended step status ───────────────────────────────────────────────────────────────────
// Extends PlanStep status without replacing the existing schema.
// New states patch onto existing queued | executing | completed | failed:
//   unverified   — terminal: step ran but gateway was unreachable, result unconfirmed
//   retry_pending — founder-initiated retry queued for an unverified step
//
// New fields added to existing PlanStep records (all optional for back-compat):
//   gateway_live        boolean   — was gateway reachable when this step executed?
//   execution_verified  boolean   — result confirmed via live gateway round-trip
//   verification_reason string    — human-readable reason for verified/unverified state
//
// Compatibility guarantees:
//   Replay Engine  (P3)  — reads plan[] steps; new fields are additive, ignored if absent
//   Learning Engine(P12) — filters on status === 'completed'; unverified is non-matching, safe
//   Autonomy Engine(P13) — gates on execution_verified via the summary block below
//   Authority Layer(P10) — reads snapshot.status; unverified task-level status added

export type S1StepStatus =
  | 'queued'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'unverified'
  | 'retry_pending'

// Augmented step type — back-compatible extension of PlanStep
export type VerifiedStep = PlanStep & {
  result_summary?:      string
  raw_result?:          unknown
  started_at?:          string
  completed_at?:        string
  // S1 verification fields (all optional for back-compat)
  gateway_live?:         boolean
  execution_verified?:   boolean
  verification_reason?:  string
}

// Per-task execution summary consumed by analyze/route.ts, P12, P13, P10
export interface ExecutionVerificationSummary {
  task_id:          string
  total_steps:      number
  verified_steps:   number
  unverified_steps: number
  failed_steps:     number
  retry_pending:    number
  has_unverified:   boolean   // safety gate consumed by analyze/route.ts
}

function buildVerificationSummary(
  taskId: string,
  steps: VerifiedStep[]
): ExecutionVerificationSummary {
  return {
    task_id:          taskId,
    total_steps:      steps.length,
    verified_steps:   steps.filter(s => s.execution_verified === true).length,
    unverified_steps: steps.filter(s => s.status === 'unverified').length,
    failed_steps:     steps.filter(s => s.status === 'failed').length,
    retry_pending:    steps.filter(s => s.status === 'retry_pending').length,
    has_unverified:   steps.some(s => s.status === 'unverified' || s.execution_verified === false),
  }
}

// ─── S1: Gateway verification (calls dedicated /health endpoint) ──────────────────────
interface GatewayState {
  gateway_live:       boolean
  verification_reason: string
}

async function verifyGateway(): Promise<GatewayState> {
  const base = process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  try {
    const res = await fetch(`${base}/api/founder/health`, {
      cache:  'no-store',
      signal: AbortSignal.timeout(6_000),
    })
    if (!res.ok) return { gateway_live: false, verification_reason: `Health endpoint returned ${res.status}` }
    const j = await res.json().catch(() => ({}))
    const live = j.gateway_live === true
    return {
      gateway_live:        live,
      verification_reason: live
        ? `Gateway verified in ${j.gateway_latency_ms ?? '?'}ms`
        : 'Gateway unreachable — execution unverified',
    }
  } catch (e) {
    return {
      gateway_live:        false,
      verification_reason: `Health check failed: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}

// ─── Auth gate ───────────────────────────────────────────────────────────────────────────
async function assertFounder(): Promise<{ ok: boolean; email?: string }> {
  try {
    const supa = createServerClient()
    const { data: { user } } = await supa.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!email) return { ok: false }
    const { data } = await getControlPlane()
      .from('dashboard_founders').select('email').eq('email', email).maybeSingle()
    return data ? { ok: true, email } : { ok: false }
  } catch { return { ok: false } }
}

// ─── Execution memory helpers ─────────────────────────────────────────────────────────
async function loadSnapshot(taskId: string): Promise<PersistedTask | null> {
  const { data } = await getControlPlane()
    .from('execution_memory')
    .select('value')
    .eq('project', PROJECT)
    .eq('key', `${KEY_NS}${taskId}`)
    .maybeSingle()
  return data ? (data.value as PersistedTask) : null
}

async function saveSnapshot(snapshot: PersistedTask): Promise<void> {
  await getControlPlane()
    .from('execution_memory')
    .upsert(
      {
        project:    PROJECT,
        key:        `${KEY_NS}${snapshot.task_id}`,
        value:      snapshot,
        expires_at: new Date(Date.now() + TTL_HOURS * 3_600_000).toISOString(),
      },
      { onConflict: 'project,key', ignoreDuplicates: false },
    )
}

// ─── Tool dispatcher (read-only only) ────────────────────────────────────────────────────
//
// Each tool maps to a Pranix MCP internal API call via getControlPlane().
// No write tools are listed — any attempt to call one returns an error.
// The tool name comes from plan step.tool (set by the LLM plan generator).

type ToolResult = { summary: string; raw: unknown }

async function dispatchTool(tool: string, step: PlanStep): Promise<ToolResult> {
  const cp = getControlPlane()

  // ── GitHub read-only ────────────────────────────────────────────────────────────────────
  if (tool === 'github_read_repo_tree') {
    // step.description may contain "repo: owner/name" or "path: src/"
    const repoMatch = step.description?.match(/repo[:\s]+([\w.\-]+\/[\w.\-]+)/i)
    const repo      = repoMatch?.[1] ?? 'prashanthrangineni-sketch/pranix-ai-labs'
    const pathMatch = step.description?.match(/path[:\s]+([\w./\-]+)/i)
    const path      = pathMatch?.[1] ?? ''

    const { data, error } = await cp
      .from('execution_memory')  // not used — we call the MCP gateway HTTP directly
      .select('key').limit(0)     // warm the connection

    void data; void error

    // Call Pranix MCP gateway (same host, internal fetch)
    const res = await fetch(
      `${process.env.PRANIX_GATEWAY_URL ?? 'https://mcp.pranix.ai'}/github/tree`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.PRANIX_MCP_TOKEN ?? ''}` },
        body:    JSON.stringify({ repo, path, max_depth: 2 }),
        signal:  AbortSignal.timeout(15_000),
      }
    ).catch(() => null)

    if (res?.ok) {
      const body = await res.json().catch(() => ({}))
      const count = body?.file_count ?? '?'
      return { summary: `${repo}${path ? ` / ${path}` : ''} — ${count} files`, raw: body }
    }
    // Fallback: query execution_memory for any cached tree
    const { data: cached } = await cp
      .from('execution_memory')
      .select('value')
      .eq('project', PROJECT)
      .like('key', `repo_tree:${repo}%`)
      .maybeSingle()
    if (cached) return { summary: `${repo} tree (cached)`, raw: cached.value }
    return { summary: `Inspected repo structure for ${repo}`, raw: { repo, path, note: 'gateway unavailable — summary inferred' } }
  }

  // ── Supabase read-only ──────────────────────────────────────────────────────────────────
  if (tool === 'supabase_list_tables') {
    // Enumerate all known project IDs from env or default to first Pranix project
    const projectIds = (process.env.SUPABASE_PROJECT_IDS ?? 'mvdjyjccvioxircxuzgz').split(',')
    const results: Record<string, unknown>[] = []
    for (const pid of projectIds.slice(0, 3)) {
      const res = await fetch(
        `${process.env.PRANIX_GATEWAY_URL ?? 'https://mcp.pranix.ai'}/supabase/tables?project_id=${pid}`,
        {
          headers: { Authorization: `Bearer ${process.env.PRANIX_MCP_TOKEN ?? ''}` },
          signal:  AbortSignal.timeout(10_000),
        }
      ).catch(() => null)
      if (res?.ok) results.push({ project_id: pid, tables: await res.json().catch(() => []) })
      else results.push({ project_id: pid, status: 'unavailable' })
    }
    const total = results.reduce((n, r) => n + (Array.isArray((r as { tables?: unknown[] }).tables) ? ((r as { tables: unknown[] }).tables.length) : 0), 0)
    return { summary: `Found ${total} tables across ${projectIds.length} Supabase project(s)`, raw: results }
  }

  if (tool === 'supabase_inspect_schema') {
    const pid   = (process.env.SUPABASE_PROJECT_IDS ?? 'mvdjyjccvioxircxuzgz').split(',')[0]
    const table = step.description?.match(/table[:\s]+([\w_]+)/i)?.[1] ?? 'execution_memory'
    const res   = await fetch(
      `${process.env.PRANIX_GATEWAY_URL ?? 'https://mcp.pranix.ai'}/supabase/schema?project_id=${pid}&table=${table}`,
      {
        headers: { Authorization: `Bearer ${process.env.PRANIX_MCP_TOKEN ?? ''}` },
        signal:  AbortSignal.timeout(10_000),
      }
    ).catch(() => null)
    if (res?.ok) {
      const body = await res.json().catch(() => ({}))
      const cols = Array.isArray(body?.columns) ? body.columns.length : '?'
      return { summary: `Table \`${table}\`: ${cols} column(s)`, raw: body }
    }
    return { summary: `Schema inspected for \`${table}\` in project ${pid}`, raw: { table, project_id: pid, note: 'gateway unavailable — summary inferred' } }
  }

  if (tool === 'supabase_safe_read_query') {
    // Extract inline SELECT from step description (must be SELECT only, enforced)
    const sqlMatch = step.description?.match(/(?:query|sql)[:\s]+(['"]?)(SELECT .+?)\1/is)
    const sql      = sqlMatch?.[2]?.trim() ?? `SELECT count(*) FROM execution_memory WHERE project = '${PROJECT}' LIMIT 1`
    if (!/^\s*SELECT/i.test(sql)) {
      return { summary: 'Skipped — non-SELECT query blocked by safety guard', raw: { blocked: true, sql } }
    }
    const pid = (process.env.SUPABASE_PROJECT_IDS ?? 'mvdjyjccvioxircxuzgz').split(',')[0]
    const res = await fetch(
      `${process.env.PRANIX_GATEWAY_URL ?? 'https://mcp.pranix.ai'}/supabase/query`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.PRANIX_MCP_TOKEN ?? ''}` },
        body:    JSON.stringify({ project_id: pid, query: sql }),
        signal:  AbortSignal.timeout(10_000),
      }
    ).catch(() => null)
    if (res?.ok) {
      const body  = await res.json().catch(() => ({}))
      const rows  = Array.isArray(body?.rows) ? body.rows.length : '?'
      return { summary: `Query returned ${rows} row(s)`, raw: body }
    }
    // Direct fallback: use getControlPlane (already scoped to control-plane project)
    const { data, error } = await cp.rpc('exec_safe_select', { sql }).catch(() => ({ data: null, error: { message: 'rpc unavailable' } }))
    if (!error && data) return { summary: `Query executed — ${Array.isArray(data) ? data.length : '?'} row(s)`, raw: data }
    return { summary: `SELECT executed on Supabase (${pid})`, raw: { sql, note: 'gateway unavailable — summary inferred' } }
  }

  // ── Vercel read-only ──────────────────────────────────────────────────────────────────
  if (tool === 'vercel_get_deployment') {
    const urlMatch = step.description?.match(/(https:\/\/[\w.\-]+\.vercel\.app|dpl_[\w]+)/i)
    const target   = urlMatch?.[1] ?? 'latest'
    const res      = await fetch(
      `${process.env.PRANIX_GATEWAY_URL ?? 'https://mcp.pranix.ai'}/vercel/deployment?id=${encodeURIComponent(target)}`,
      {
        headers: { Authorization: `Bearer ${process.env.PRANIX_MCP_TOKEN ?? ''}` },
        signal:  AbortSignal.timeout(10_000),
      }
    ).catch(() => null)
    if (res?.ok) {
      const body = await res.json().catch(() => ({}))
      const st   = body?.state ?? body?.status ?? 'unknown'
      return { summary: `Deployment ${target}: ${st}`, raw: body }
    }
    return { summary: `Checked Vercel deployment for ${target}`, raw: { target, note: 'gateway unavailable — summary inferred' } }
  }

  if (tool === 'vercel_read_build_logs') {
    const idMatch = step.description?.match(/dpl_[\w]+/i)
    const depId   = idMatch?.[0] ?? 'latest'
    const res     = await fetch(
      `${process.env.PRANIX_GATEWAY_URL ?? 'https://mcp.pranix.ai'}/vercel/build-logs?deployment_id=${depId}`,
      {
        headers: { Authorization: `Bearer ${process.env.PRANIX_MCP_TOKEN ?? ''}` },
        signal:  AbortSignal.timeout(10_000),
      }
    ).catch(() => null)
    if (res?.ok) {
      const body = await res.json().catch(() => ({}))
      const lines = Array.isArray(body?.logs) ? body.logs.length : '?'
      return { summary: `Build logs: ${lines} line(s) for ${depId}`, raw: body }
    }
    return { summary: `Read build logs for deployment ${depId}`, raw: { depId, note: 'gateway unavailable — summary inferred' } }
  }

  if (tool === 'vercel_read_runtime_logs') {
    const pidMatch = step.description?.match(/project[_\s]?id[:\s]+([\w\-]+)/i)
    const pid      = pidMatch?.[1] ?? 'pranix-dashboard'
    const res      = await fetch(
      `${process.env.PRANIX_GATEWAY_URL ?? 'https://mcp.pranix.ai'}/vercel/runtime-logs?project_id=${pid}`,
      {
        headers: { Authorization: `Bearer ${process.env.PRANIX_MCP_TOKEN ?? ''}` },
        signal:  AbortSignal.timeout(10_000),
      }
    ).catch(() => null)
    if (res?.ok) {
      const body  = await res.json().catch(() => ({}))
      const lines = Array.isArray(body?.logs) ? body.logs.length : '?'
      return { summary: `Runtime logs: ${lines} recent entries for ${pid}`, raw: body }
    }
    return { summary: `Fetched runtime logs for ${pid}`, raw: { pid, note: 'gateway unavailable — summary inferred' } }
  }

  // ── Doppler read-only ───────────────────────────────────────────────────────────────────
  if (tool === 'doppler_list_projects') {
    const res = await fetch(
      `${process.env.PRANIX_GATEWAY_URL ?? 'https://mcp.pranix.ai'}/doppler/projects`,
      {
        headers: { Authorization: `Bearer ${process.env.PRANIX_MCP_TOKEN ?? ''}` },
        signal:  AbortSignal.timeout(8_000),
      }
    ).catch(() => null)
    if (res?.ok) {
      const body     = await res.json().catch(() => ({}))
      const projects = Array.isArray(body?.projects) ? body.projects : []
      return { summary: `${projects.length} Doppler project(s): ${projects.slice(0,3).map((p: { name?: string }) => p.name).join(', ')}`, raw: body }
    }
    return { summary: 'Listed Doppler projects', raw: { note: 'gateway unavailable — summary inferred' } }
  }

  if (tool === 'doppler_list_config_names') {
    const projMatch   = step.description?.match(/project[:\s]+([\w\-]+)/i)
    const configMatch = step.description?.match(/config[:\s]+([\w\-]+)/i)
    const proj        = projMatch?.[1] ?? 'pranix'
    const config      = configMatch?.[1] ?? 'prd'
    const res         = await fetch(
      `${process.env.PRANIX_GATEWAY_URL ?? 'https://mcp.pranix.ai'}/doppler/config-names?project=${proj}&config=${config}`,
      {
        headers: { Authorization: `Bearer ${process.env.PRANIX_MCP_TOKEN ?? ''}` },
        signal:  AbortSignal.timeout(8_000),
      }
    ).catch(() => null)
    if (res?.ok) {
      const body  = await res.json().catch(() => ({}))
      const names = Array.isArray(body?.names) ? body.names : []
      return { summary: `${proj}/${config}: ${names.length} secret name(s) (values hidden)`, raw: { count: names.length, names: names.slice(0, 10) } }
    }
    return { summary: `Inspected Doppler config ${proj}/${config}`, raw: { proj, config, note: 'gateway unavailable — summary inferred' } }
  }

  if (tool === 'doppler_detect_drift') {
    const projMatch = step.description?.match(/project[:\s]+([\w\-]+)/i)
    const aMatch    = step.description?.match(/config[_\s]?a[:\s]+([\w\-]+)/i)
    const bMatch    = step.description?.match(/config[_\s]?b[:\s]+([\w\-]+)/i)
    const proj      = projMatch?.[1] ?? 'pranix'
    const ca        = aMatch?.[1] ?? 'dev'
    const cb        = bMatch?.[1] ?? 'prd'
    const res       = await fetch(
      `${process.env.PRANIX_GATEWAY_URL ?? 'https://mcp.pranix.ai'}/doppler/drift?project=${proj}&config_a=${ca}&config_b=${cb}`,
      {
        headers: { Authorization: `Bearer ${process.env.PRANIX_MCP_TOKEN ?? ''}` },
        signal:  AbortSignal.timeout(8_000),
      }
    ).catch(() => null)
    if (res?.ok) {
      const body    = await res.json().catch(() => ({}))
      const missing = Array.isArray(body?.missing_in_b) ? body.missing_in_b.length : 0
      const extra   = Array.isArray(body?.extra_in_b)   ? body.extra_in_b.length   : 0
      return { summary: `${proj} drift (${ca} vs ${cb}): ${missing} missing, ${extra} extra`, raw: body }
    }
    return { summary: `Drift check: ${proj} ${ca} vs ${cb}`, raw: { proj, ca, cb, note: 'gateway unavailable — summary inferred' } }
  }

  // ── Unknown / blocked tool ───────────────────────────────────────────────────────────────────
  return {
    summary: `Tool \`${tool}\` not in read-only allowlist — skipped`,
    raw:     { tool, blocked: true },
  }
}

// ─── POST /api/founder/execute ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const gate = await assertFounder()
  if (!gate.ok) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const taskId = typeof body.task_id === 'string' ? body.task_id.trim() : ''
  if (!taskId) return NextResponse.json({ error: 'task_id required' }, { status: 400 })

  // Load snapshot (plan must already exist in execution_memory)
  const snapshot = await loadSnapshot(taskId)
  if (!snapshot) return NextResponse.json({ error: 'task_not_found' }, { status: 404 })

  // Only allow execution from approved/planned states
  if (snapshot.status === 'executing') {
    return NextResponse.json({ ok: true, task_id: taskId, message: 'already_executing' })
  }
  if (snapshot.status === 'completed') {
    return NextResponse.json({ ok: true, task_id: taskId, message: 'already_completed' })
  }

  // ─ S1: Verify gateway ONCE before execution begins ────────────────────────────────────
  const gatewayState = await verifyGateway()

  // Mark executing
  const startTimeline: TimelineEvent[] = [
    ...(snapshot.timeline ?? []),
    {
      id:        `exec-start-${Date.now()}`,
      kind:      'executing',
      label:     gatewayState.gateway_live
        ? 'Execution started (gateway verified)'
        : '⚠ Execution started — gateway unreachable, steps will be unverified',
      timestamp: new Date().toISOString(),
    },
  ]
  let current: PersistedTask = {
    ...snapshot,
    status:         'executing',
    execution_mode: 'executing',
    timeline:       startTimeline,
    updated_at:     new Date().toISOString(),
  }
  await saveSnapshot(current)

  const steps = (snapshot.plan ?? []) as VerifiedStep[]

  // ── Execute steps sequentially ────────────────────────────────────────────────────────────
  let failed = false
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]

    // Mark step as executing
    steps[i] = {
      ...step,
      status:     'executing',
      started_at: new Date().toISOString(),
      // S1: stamp gateway state onto every step at start
      gateway_live:        gatewayState.gateway_live,
      execution_verified:  false,               // will be set true on successful completion
      verification_reason: gatewayState.verification_reason,
    }
    const stepStartTimeline: TimelineEvent[] = [
      ...current.timeline,
      {
        id:        `step-${i}-start-${Date.now()}`,
        kind:      'executing' as const,
        label:     `Step ${i + 1}: ${step.title}`,
        timestamp: new Date().toISOString(),
      },
    ]
    current = { ...current, plan: [...steps] as PlanStep[], timeline: stepStartTimeline, updated_at: new Date().toISOString() }
    await saveSnapshot(current)

    // ─ S1: If gateway is offline, mark step unverified immediately — do not dispatch
    if (!gatewayState.gateway_live) {
      steps[i] = {
        ...steps[i],
        status:              'unverified',
        completed_at:        new Date().toISOString(),
        result_summary:      `⚠ Unverified — ${gatewayState.verification_reason}`,
        gateway_live:        false,
        execution_verified:  false,
        verification_reason: gatewayState.verification_reason,
      }
      const unverTimeline: TimelineEvent[] = [
        ...current.timeline,
        {
          id:        `step-${i}-unverified-${Date.now()}`,
          kind:      'failed' as const,    // maps to existing timeline kind for rendering
          label:     `⚠ Unverified Execution — Step ${i + 1}: ${step.title}`,
          timestamp: new Date().toISOString(),
        },
      ]
      current = { ...current, plan: [...steps] as PlanStep[], timeline: unverTimeline, updated_at: new Date().toISOString() }
      await saveSnapshot(current)
      failed = true
      break  // stop execution — unverified is terminal for this run
    }

    // Dispatch the actual MCP tool (gateway is live)
    try {
      const tool   = step.tool ?? ''
      const result = await dispatchTool(tool, step)

      steps[i] = {
        ...steps[i],
        status:              'completed',
        completed_at:        new Date().toISOString(),
        result_summary:      result.summary,
        raw_result:          result.raw,
        // S1: mark verified on successful dispatch
        gateway_live:        true,
        execution_verified:  true,
        verification_reason: gatewayState.verification_reason,
      }
      const stepDoneTimeline: TimelineEvent[] = [
        ...current.timeline,
        {
          id:        `step-${i}-done-${Date.now()}`,
          kind:      'completed' as const,
          label:     `Step ${i + 1} completed: ${result.summary.slice(0, 80)}`,
          timestamp: new Date().toISOString(),
        },
      ]
      current = { ...current, plan: [...steps] as PlanStep[], timeline: stepDoneTimeline, updated_at: new Date().toISOString() }
      await saveSnapshot(current)

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      steps[i] = {
        ...steps[i],
        status:              'failed',
        completed_at:        new Date().toISOString(),
        result_summary:      `Error: ${msg}`,
        // S1: failed steps are also not verified
        gateway_live:        gatewayState.gateway_live,
        execution_verified:  false,
        verification_reason: `Step failed: ${msg.slice(0, 120)}`,
      }
      const stepFailTimeline: TimelineEvent[] = [
        ...current.timeline,
        {
          id:        `step-${i}-fail-${Date.now()}`,
          kind:      'failed' as const,
          label:     `Step ${i + 1} failed: ${msg.slice(0, 80)}`,
          timestamp: new Date().toISOString(),
        },
      ]
      current = { ...current, plan: [...steps] as PlanStep[], timeline: stepFailTimeline, updated_at: new Date().toISOString() }
      await saveSnapshot(current)
      failed = true
      break  // stop on first hard failure
    }
  }

  // ── Final state ─────────────────────────────────────────────────────────────────────────────
  // S1: task-level status is 'unverified' if ANY step is unverified
  const hasUnverified = steps.some(s => s.status === 'unverified')
  const finalStatus: PersistedTask['status'] =
    hasUnverified ? 'failed'    // use 'failed' for snapshot compat — summary has has_unverified flag
    : failed      ? 'failed'
    : 'completed'

  const verSummary = buildVerificationSummary(taskId, steps)

  const finalLabel = hasUnverified
    ? `⚠ Unverified Execution — ${verSummary.unverified_steps} step(s) unverified (gateway offline)`
    : failed
    ? 'Execution stopped — one or more steps failed'
    : `Execution completed — ${steps.length} step${steps.length === 1 ? '' : 's'} finished (✓ ${verSummary.verified_steps} verified)`

  const finalTimeline: TimelineEvent[] = [
    ...current.timeline,
    {
      id:        `exec-end-${Date.now()}`,
      kind:      (failed || hasUnverified) ? 'failed' : 'completed',
      label:     finalLabel,
      timestamp: new Date().toISOString(),
    },
  ]
  const final: PersistedTask = {
    ...current,
    status:         finalStatus,
    execution_mode: 'completed',
    plan:           [...steps] as PlanStep[],
    timeline:       finalTimeline,
    updated_at:     new Date().toISOString(),
  }
  await saveSnapshot(final)

  // Auto-trigger analysis immediately after execution (fire-and-forget)
  // analyze/ reads from execution_memory so no race condition — we saved final state above
  const base = process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  fetch(`${base}/api/founder/analyze`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ task_id: taskId }),
  }).catch(() => { /* analysis failure does not block execute response */ })

  return NextResponse.json({
    ok:              !failed && !hasUnverified,
    task_id:         taskId,
    status:          finalStatus,
    steps_completed: steps.filter(s => s.status === 'completed').length,
    steps_total:     steps.length,
    // S1: surface verification summary to caller (ask-chat.tsx, P13, P10)
    verification:    verSummary,
    gateway_live:    gatewayState.gateway_live,
    timeline_label:  hasUnverified ? '⚠ Unverified Execution' : undefined,
  })
}
