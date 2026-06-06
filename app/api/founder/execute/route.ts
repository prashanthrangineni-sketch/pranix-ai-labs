import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '../../../lib/control-plane'
import type { PlanStep, TimelineEvent, PersistedTask } from '../../founder/ask/ask-chat'

export const dynamic    = 'force-dynamic'
export const maxDuration = 60

const PROJECT   = 'pranix-dashboard'
const KEY_NS    = 'ask:task:'
const TTL_HOURS = 168

// ── S1: Execution step status now includes 'unverified' ───────────────────────
//
// A step is 'unverified' when the MCP gateway was unreachable and the result
// is an inferred summary rather than real tool output.  Unverified is TERMINAL
// — a step can never transition from 'unverified' to 'completed'.
//
// ExecutionVerification is attached to every POST response and to the
// execution_memory snapshot so Analysis, Replay, and Mission Control can all
// read it.

export interface ExecutionVerification {
  gateway_live:          boolean
  execution_verified:    boolean
  verified_steps:        number
  unverified_steps:      number
  failed_steps:          number
  total_steps:           number
  // Safety: when any unverified step exists, Analysis must not recommend
  // 'approve_next_step'.  This flag propagates into the analyze route.
  has_unverified:        boolean
}

// ── Auth gate ─────────────────────────────────────────────────────────────────
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

// ── Execution memory helpers ──────────────────────────────────────────────────
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

// ── S1: Gateway health probe ──────────────────────────────────────────────────
//
// A lightweight HEAD (or GET /health) request to the gateway before execution
// begins.  If this fails the entire execution run proceeds in 'unverified' mode
// — every tool result will carry the 'unverified' status.

const GATEWAY = process.env.PRANIX_GATEWAY_URL ?? 'https://mcp.pranix.ai'
const MCP_TOKEN = process.env.PRANIX_MCP_TOKEN ?? ''

async function probeGateway(): Promise<boolean> {
  try {
    const res = await fetch(`${GATEWAY}/health`, {
      method:  'GET',
      headers: { Authorization: `Bearer ${MCP_TOKEN}` },
      signal:  AbortSignal.timeout(5_000),
    }).catch(() => null)
    // Accept 200-299 or 405 (Method Not Allowed — endpoint exists but HEAD blocked)
    if (res && (res.ok || res.status === 405)) return true
    // Fallback: try a known cheap tool endpoint
    const fb = await fetch(`${GATEWAY}/ping`, {
      headers: { Authorization: `Bearer ${MCP_TOKEN}` },
      signal:  AbortSignal.timeout(4_000),
    }).catch(() => null)
    return !!(fb && (fb.ok || fb.status === 405))
  } catch {
    return false
  }
}

// ── Tool dispatcher ───────────────────────────────────────────────────────────
//
// Returns { summary, raw, verified }.
// verified = true  → real tool output from live gateway
// verified = false → inferred fallback; caller sets step status = 'unverified'

type ToolResult = { summary: string; raw: unknown; verified: boolean }

async function dispatchTool(
  tool: string,
  step: PlanStep,
  gatewayLive: boolean,
): Promise<ToolResult> {
  // When the gateway is known-offline, skip every network attempt immediately
  // and return unverified.  This avoids timeout delays per step.
  if (!gatewayLive) {
    return {
      summary:  `[UNVERIFIED] ${step.title} — gateway offline, result not confirmed`,
      raw:      { tool, gateway_live: false, note: 'gateway unavailable — result not verified' },
      verified: false,
    }
  }

  const cp = getControlPlane()

  // ── GitHub read-only ────────────────────────────────────────────────────────
  if (tool === 'github_read_repo_tree') {
    const repoMatch = step.description?.match(/repo[:\s]+([\w.\-]+\/[\w.\-]+)/i)
    const repo      = repoMatch?.[1] ?? 'prashanthrangineni-sketch/pranix-ai-labs'
    const pathMatch = step.description?.match(/path[:\s]+([\w./\-]+)/i)
    const path      = pathMatch?.[1] ?? ''

    void cp.from('execution_memory').select('key').limit(0)  // warm connection

    const res = await fetch(`${GATEWAY}/github/tree`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MCP_TOKEN}` },
      body:    JSON.stringify({ repo, path, max_depth: 2 }),
      signal:  AbortSignal.timeout(15_000),
    }).catch(() => null)

    if (res?.ok) {
      const body  = await res.json().catch(() => ({}))
      const count = body?.file_count ?? '?'
      return { summary: `${repo}${path ? ` / ${path}` : ''} — ${count} files`, raw: body, verified: true }
    }
    // Cached fallback — still NOT live, mark unverified
    const { data: cached } = await cp
      .from('execution_memory').select('value')
      .eq('project', PROJECT).like('key', `repo_tree:${repo}%`).maybeSingle()
    if (cached) {
      return { summary: `${repo} tree (cached — not live)`, raw: cached.value, verified: false }
    }
    return {
      summary:  `[UNVERIFIED] ${repo} — gateway unreachable, result not confirmed`,
      raw:      { repo, path, gateway_live: false, note: 'gateway unavailable — result not verified' },
      verified: false,
    }
  }

  // ── Supabase read-only ──────────────────────────────────────────────────────
  if (tool === 'supabase_list_tables') {
    const projectIds = (process.env.SUPABASE_PROJECT_IDS ?? 'mvdjyjccvioxircxuzgz').split(',')
    const results: Record<string, unknown>[] = []
    let anyLive = false
    for (const pid of projectIds.slice(0, 3)) {
      const res = await fetch(
        `${GATEWAY}/supabase/tables?project_id=${pid}`,
        { headers: { Authorization: `Bearer ${MCP_TOKEN}` }, signal: AbortSignal.timeout(10_000) },
      ).catch(() => null)
      if (res?.ok) {
        results.push({ project_id: pid, tables: await res.json().catch(() => []) })
        anyLive = true
      } else {
        results.push({ project_id: pid, status: 'unavailable' })
      }
    }
    const total = results.reduce((n, r) => n + (Array.isArray((r as { tables?: unknown[] }).tables) ? ((r as { tables: unknown[] }).tables.length) : 0), 0)
    return {
      summary:  anyLive ? `Found ${total} tables across ${projectIds.length} Supabase project(s)` : `[UNVERIFIED] Supabase tables — gateway unreachable`,
      raw:      results,
      verified: anyLive,
    }
  }

  if (tool === 'supabase_inspect_schema') {
    const pid   = (process.env.SUPABASE_PROJECT_IDS ?? 'mvdjyjccvioxircxuzgz').split(',')[0]
    const table = step.description?.match(/table[:\s]+([\w_]+)/i)?.[1] ?? 'execution_memory'
    const res   = await fetch(
      `${GATEWAY}/supabase/schema?project_id=${pid}&table=${table}`,
      { headers: { Authorization: `Bearer ${MCP_TOKEN}` }, signal: AbortSignal.timeout(10_000) },
    ).catch(() => null)
    if (res?.ok) {
      const body = await res.json().catch(() => ({}))
      const cols = Array.isArray(body?.columns) ? body.columns.length : '?'
      return { summary: `Table \`${table}\`: ${cols} column(s)`, raw: body, verified: true }
    }
    return {
      summary:  `[UNVERIFIED] Schema for \`${table}\` — gateway unreachable`,
      raw:      { table, project_id: pid, gateway_live: false, note: 'gateway unavailable — result not verified' },
      verified: false,
    }
  }

  if (tool === 'supabase_safe_read_query') {
    const sqlMatch = step.description?.match(/(?:query|sql)[:\s]+(['"]?)(SELECT .+?)\1/is)
    const sql      = sqlMatch?.[2]?.trim() ?? `SELECT count(*) FROM execution_memory WHERE project = '${PROJECT}' LIMIT 1`
    if (!/^\s*SELECT/i.test(sql)) {
      return { summary: 'Skipped — non-SELECT query blocked by safety guard', raw: { blocked: true, sql }, verified: false }
    }
    const pid = (process.env.SUPABASE_PROJECT_IDS ?? 'mvdjyjccvioxircxuzgz').split(',')[0]
    const res = await fetch(`${GATEWAY}/supabase/query`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MCP_TOKEN}` },
      body:    JSON.stringify({ project_id: pid, query: sql }),
      signal:  AbortSignal.timeout(10_000),
    }).catch(() => null)
    if (res?.ok) {
      const body = await res.json().catch(() => ({}))
      const rows = Array.isArray(body?.rows) ? body.rows.length : '?'
      return { summary: `Query returned ${rows} row(s)`, raw: body, verified: true }
    }
    // Direct RPC fallback — real data, mark verified
    const { data, error } = await cp.rpc('exec_safe_select', { sql }).catch(() => ({ data: null, error: { message: 'rpc unavailable' } }))
    if (!error && data) return { summary: `Query executed — ${Array.isArray(data) ? data.length : '?'} row(s)`, raw: data, verified: true }
    return {
      summary:  `[UNVERIFIED] SELECT on Supabase (${pid}) — gateway unreachable`,
      raw:      { sql, gateway_live: false, note: 'gateway unavailable — result not verified' },
      verified: false,
    }
  }

  // ── Vercel read-only ────────────────────────────────────────────────────────
  if (tool === 'vercel_get_deployment') {
    const urlMatch = step.description?.match(/(https:\/\/[\w.\-]+\.vercel\.app|dpl_[\w]+)/i)
    const target   = urlMatch?.[1] ?? 'latest'
    const res      = await fetch(
      `${GATEWAY}/vercel/deployment?id=${encodeURIComponent(target)}`,
      { headers: { Authorization: `Bearer ${MCP_TOKEN}` }, signal: AbortSignal.timeout(10_000) },
    ).catch(() => null)
    if (res?.ok) {
      const body = await res.json().catch(() => ({}))
      const st   = body?.state ?? body?.status ?? 'unknown'
      return { summary: `Deployment ${target}: ${st}`, raw: body, verified: true }
    }
    return {
      summary:  `[UNVERIFIED] Vercel deployment ${target} — gateway unreachable`,
      raw:      { target, gateway_live: false, note: 'gateway unavailable — result not verified' },
      verified: false,
    }
  }

  if (tool === 'vercel_read_build_logs') {
    const idMatch = step.description?.match(/dpl_[\w]+/i)
    const depId   = idMatch?.[0] ?? 'latest'
    const res     = await fetch(
      `${GATEWAY}/vercel/build-logs?deployment_id=${depId}`,
      { headers: { Authorization: `Bearer ${MCP_TOKEN}` }, signal: AbortSignal.timeout(10_000) },
    ).catch(() => null)
    if (res?.ok) {
      const body  = await res.json().catch(() => ({}))
      const lines = Array.isArray(body?.logs) ? body.logs.length : '?'
      return { summary: `Build logs: ${lines} line(s) for ${depId}`, raw: body, verified: true }
    }
    return {
      summary:  `[UNVERIFIED] Build logs for ${depId} — gateway unreachable`,
      raw:      { depId, gateway_live: false, note: 'gateway unavailable — result not verified' },
      verified: false,
    }
  }

  if (tool === 'vercel_read_runtime_logs') {
    const pidMatch = step.description?.match(/project[_\s]?id[:\s]+([\w\-]+)/i)
    const pid      = pidMatch?.[1] ?? 'pranix-dashboard'
    const res      = await fetch(
      `${GATEWAY}/vercel/runtime-logs?project_id=${pid}`,
      { headers: { Authorization: `Bearer ${MCP_TOKEN}` }, signal: AbortSignal.timeout(10_000) },
    ).catch(() => null)
    if (res?.ok) {
      const body  = await res.json().catch(() => ({}))
      const lines = Array.isArray(body?.logs) ? body.logs.length : '?'
      return { summary: `Runtime logs: ${lines} recent entries for ${pid}`, raw: body, verified: true }
    }
    return {
      summary:  `[UNVERIFIED] Runtime logs for ${pid} — gateway unreachable`,
      raw:      { pid, gateway_live: false, note: 'gateway unavailable — result not verified' },
      verified: false,
    }
  }

  // ── Doppler read-only ───────────────────────────────────────────────────────
  if (tool === 'doppler_list_projects') {
    const res = await fetch(`${GATEWAY}/doppler/projects`, {
      headers: { Authorization: `Bearer ${MCP_TOKEN}` },
      signal:  AbortSignal.timeout(8_000),
    }).catch(() => null)
    if (res?.ok) {
      const body     = await res.json().catch(() => ({}))
      const projects = Array.isArray(body?.projects) ? body.projects : []
      return { summary: `${projects.length} Doppler project(s): ${projects.slice(0,3).map((p: { name?: string }) => p.name).join(', ')}`, raw: body, verified: true }
    }
    return {
      summary:  '[UNVERIFIED] Doppler projects — gateway unreachable',
      raw:      { gateway_live: false, note: 'gateway unavailable — result not verified' },
      verified: false,
    }
  }

  if (tool === 'doppler_list_config_names') {
    const projMatch   = step.description?.match(/project[:\s]+([\w\-]+)/i)
    const configMatch = step.description?.match(/config[:\s]+([\w\-]+)/i)
    const proj        = projMatch?.[1] ?? 'pranix'
    const config      = configMatch?.[1] ?? 'prd'
    const res         = await fetch(
      `${GATEWAY}/doppler/config-names?project=${proj}&config=${config}`,
      { headers: { Authorization: `Bearer ${MCP_TOKEN}` }, signal: AbortSignal.timeout(8_000) },
    ).catch(() => null)
    if (res?.ok) {
      const body  = await res.json().catch(() => ({}))
      const names = Array.isArray(body?.names) ? body.names : []
      return { summary: `${proj}/${config}: ${names.length} secret name(s) (values hidden)`, raw: { count: names.length, names: names.slice(0, 10) }, verified: true }
    }
    return {
      summary:  `[UNVERIFIED] Doppler config ${proj}/${config} — gateway unreachable`,
      raw:      { proj, config, gateway_live: false, note: 'gateway unavailable — result not verified' },
      verified: false,
    }
  }

  if (tool === 'doppler_detect_drift') {
    const projMatch = step.description?.match(/project[:\s]+([\w\-]+)/i)
    const aMatch    = step.description?.match(/config[_\s]?a[:\s]+([\w\-]+)/i)
    const bMatch    = step.description?.match(/config[_\s]?b[:\s]+([\w\-]+)/i)
    const proj      = projMatch?.[1] ?? 'pranix'
    const ca        = aMatch?.[1] ?? 'dev'
    const cb        = bMatch?.[1] ?? 'prd'
    const res       = await fetch(
      `${GATEWAY}/doppler/drift?project=${proj}&config_a=${ca}&config_b=${cb}`,
      { headers: { Authorization: `Bearer ${MCP_TOKEN}` }, signal: AbortSignal.timeout(8_000) },
    ).catch(() => null)
    if (res?.ok) {
      const body    = await res.json().catch(() => ({}))
      const missing = Array.isArray(body?.missing_in_b) ? body.missing_in_b.length : 0
      const extra   = Array.isArray(body?.extra_in_b)   ? body.extra_in_b.length   : 0
      return { summary: `${proj} drift (${ca} vs ${cb}): ${missing} missing, ${extra} extra`, raw: body, verified: true }
    }
    return {
      summary:  `[UNVERIFIED] Drift check ${proj} ${ca} vs ${cb} — gateway unreachable`,
      raw:      { proj, ca, cb, gateway_live: false, note: 'gateway unavailable — result not verified' },
      verified: false,
    }
  }

  // ── Unknown / blocked tool ──────────────────────────────────────────────────
  return {
    summary:  `Tool \`${tool}\` not in read-only allowlist — skipped`,
    raw:      { tool, blocked: true },
    verified: false,
  }
}

// ── POST /api/founder/execute ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const gate = await assertFounder()
  if (!gate.ok) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const taskId = typeof body.task_id === 'string' ? body.task_id.trim() : ''
  if (!taskId) return NextResponse.json({ error: 'task_id required' }, { status: 400 })

  const snapshot = await loadSnapshot(taskId)
  if (!snapshot) return NextResponse.json({ error: 'task_not_found' }, { status: 404 })

  if (snapshot.status === 'executing') {
    return NextResponse.json({ ok: true, task_id: taskId, message: 'already_executing' })
  }
  if (snapshot.status === 'completed') {
    return NextResponse.json({ ok: true, task_id: taskId, message: 'already_completed' })
  }

  // ── S1: Probe gateway BEFORE marking any step 'executing' ───────────────────
  const gatewayLive = await probeGateway()

  // Mark task executing — record gateway_live in initial timeline event
  const startTimeline: TimelineEvent[] = [
    ...(snapshot.timeline ?? []),
    {
      id:        `exec-start-${Date.now()}`,
      kind:      'executing' as const,
      label:     gatewayLive
        ? 'Execution started — gateway connected'
        : '⚠ Execution started — gateway offline, results will be unverified',
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

  const steps = (snapshot.plan ?? []) as Array<
    PlanStep & {
      result_summary?: string
      raw_result?:     unknown
      started_at?:     string
      completed_at?:   string
      verified?:       boolean
    }
  >

  let failed = false
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]

    steps[i] = { ...step, status: 'executing', started_at: new Date().toISOString() }
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

    try {
      const tool   = step.tool ?? ''
      const result = await dispatchTool(tool, step, gatewayLive)

      // ── S1: Only set 'completed' when result is verified ─────────────────────
      //        Unverified results get 'unverified' status (terminal — never
      //        promoted to 'completed' by any downstream process).
      const stepStatus = result.verified ? 'completed' : 'unverified'

      steps[i] = {
        ...steps[i],
        status:         stepStatus,
        completed_at:   new Date().toISOString(),
        result_summary: result.summary,
        raw_result:     result.raw,
        verified:       result.verified,
      }

      const stepDoneTimeline: TimelineEvent[] = [
        ...current.timeline,
        {
          id:        `step-${i}-done-${Date.now()}`,
          kind:      result.verified ? ('completed' as const) : ('unverified' as const),
          label:     result.verified
            ? `Step ${i + 1} completed: ${result.summary.slice(0, 80)}`
            : `⚠ Step ${i + 1} unverified: ${result.summary.slice(0, 80)}`,
          timestamp: new Date().toISOString(),
        },
      ]
      current = { ...current, plan: [...steps] as PlanStep[], timeline: stepDoneTimeline, updated_at: new Date().toISOString() }
      await saveSnapshot(current)

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      steps[i] = {
        ...steps[i],
        status:         'failed',
        completed_at:   new Date().toISOString(),
        result_summary: `Error: ${msg}`,
        verified:       false,
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
      break
    }
  }

  // ── S1: Build execution verification summary ─────────────────────────────────
  const verifiedSteps   = steps.filter(s => (s as typeof s & { verified?: boolean }).verified === true).length
  const unverifiedSteps = steps.filter(s => s.status === 'unverified').length
  const failedSteps     = steps.filter(s => s.status === 'failed').length
  const hasUnverified   = unverifiedSteps > 0

  const verification: ExecutionVerification = {
    gateway_live:       gatewayLive,
    execution_verified: !hasUnverified && !failed,
    verified_steps:     verifiedSteps,
    unverified_steps:   unverifiedSteps,
    failed_steps:       failedSteps,
    total_steps:        steps.length,
    has_unverified:     hasUnverified,
  }

  // ── S1: Final task status ─────────────────────────────────────────────────────
  //  - 'unverified' when any step is unverified (even if no hard failure)
  //  - 'failed'     when a step threw
  //  - 'completed'  only when ALL steps are verified-complete
  const finalStatus: PersistedTask['status'] =
    failed          ? 'failed'
    : hasUnverified ? 'unverified'
    :                 'completed'

  const finalTimeline: TimelineEvent[] = [
    ...current.timeline,
    {
      id:        `exec-end-${Date.now()}`,
      kind:      failed          ? ('failed' as const)
               : hasUnverified  ? ('unverified' as const)
               :                  ('completed' as const),
      label:     failed
        ? 'Execution stopped — one or more steps failed'
        : hasUnverified
          ? `⚠ Unverified Execution — ${unverifiedSteps} step${unverifiedSteps === 1 ? '' : 's'} could not be confirmed (gateway offline)`
          : `Execution completed — ${steps.length} step${steps.length === 1 ? '' : 's'} verified`,
      timestamp: new Date().toISOString(),
    },
  ]

  const final: PersistedTask = {
    ...current,
    status:         finalStatus,
    execution_mode: 'completed',
    plan:           [...steps] as PlanStep[],
    timeline:       finalTimeline,
    // Attach verification to snapshot so Analysis and Replay can read it
    verification,
    updated_at:     new Date().toISOString(),
  } as PersistedTask & { verification: ExecutionVerification }
  await saveSnapshot(final)

  // Auto-trigger analysis (fire-and-forget)
  // Verification is now in execution_memory; analyze route will read has_unverified
  // and must NOT return 'approve_next_step' when has_unverified = true.
  const base = process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  fetch(`${base}/api/founder/analyze`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ task_id: taskId }),
  }).catch(() => {})

  return NextResponse.json({
    ok:      !failed && !hasUnverified,
    task_id: taskId,
    status:  finalStatus,
    // S1: surface verification summary at top level
    gateway_live:       gatewayLive,
    execution_verified: verification.execution_verified,
    verification,
    steps_completed:  verifiedSteps,
    steps_unverified: unverifiedSteps,
    steps_failed:     failedSteps,
    steps_total:      steps.length,
  })
}

// ── GET /api/founder/execute — gateway health probe ───────────────────────────
//
// Mission Control calls GET /api/founder/execute to display the gateway
// health banner.  Returns { gateway_live, status } with no auth requirement
// (public health signal, no sensitive data exposed).

export async function GET() {
  const live = await probeGateway()
  return NextResponse.json({
    gateway_live: live,
    status:       live ? 'connected' : 'offline',
    checked_at:   new Date().toISOString(),
  })
}
