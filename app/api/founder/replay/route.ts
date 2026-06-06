/**
 * GET /api/founder/replay?task_id=<id>
 *
 * Loads a completed task from execution_memory, reconstructs per-step
 * evidence with deterministic SHA-256 hashes, and returns an integrity
 * verification report.  Read-only — no writes of any kind.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { createHash }                from 'crypto'

// ── Supabase (service role for execution_memory reads) ─────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

// ── Types ──────────────────────────────────────────────────────────────────
interface ReplayStep {
  step_id:        string
  tool:           string
  executed_at:    string
  result_summary: string
  raw_result:     unknown
  evidence_hash:  string
}

interface Verification {
  verified_steps:   number
  total_steps:      number
  integrity_status: 'verified' | 'partial' | 'failed'
}

// ── Helpers ────────────────────────────────────────────────────────────────
function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

function evidenceHash(tool: string, summary: string, raw: unknown): string {
  return sha256(tool + summary + JSON.stringify(raw ?? null))
}

/** Best-effort extraction of the tool name from a plan step. */
function extractTool(step: Record<string, unknown>): string {
  if (typeof step.tool === 'string' && step.tool) return step.tool
  if (typeof step.mcp_tool === 'string' && step.mcp_tool) return step.mcp_tool
  if (typeof step.action === 'string' && step.action) return step.action
  if (typeof step.title === 'string') {
    // Try to infer from step title e.g. "Run vercel_get_deployment"
    const m = step.title.match(/\b([\w]+_[\w]+)\b/)
    if (m) return m[1]
  }
  return 'unknown_tool'
}

/** Derive a concise result summary from raw execution output. */
function summarise(raw: unknown): string {
  if (!raw) return 'No result captured'
  if (typeof raw === 'string') return raw.slice(0, 200)
  const obj = raw as Record<string, unknown>

  // Common MCP result shapes
  if (typeof obj.content === 'string') return obj.content.slice(0, 200)
  if (Array.isArray(obj.content)) {
    const text = (obj.content as { text?: string }[]).map(c => c.text ?? '').join(' ')
    return text.slice(0, 200)
  }
  if (typeof obj.result === 'string') return obj.result.slice(0, 200)
  if (typeof obj.summary === 'string') return obj.summary.slice(0, 200)
  if (typeof obj.message === 'string') return obj.message.slice(0, 200)
  if (typeof obj.status === 'string')  return `status: ${obj.status}`

  // Fallback — stringified excerpt
  return JSON.stringify(raw).slice(0, 200)
}

// ── Route ──────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('task_id')
  if (!taskId) {
    return NextResponse.json({ error: 'task_id is required' }, { status: 400 })
  }

  // Load from execution_memory — key = task:<taskId>
  const { data, error } = await supabase
    .from('execution_memory')
    .select('value, updated_at')
    .eq('project', 'pranix')
    .or(`key.eq.task:${taskId},key.like.agent_task:${taskId}%`)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'DB error', detail: error.message }, { status: 500 })
  }
  if (!data?.value) {
    return NextResponse.json({ error: 'Task not found', task_id: taskId }, { status: 404 })
  }

  const task = data.value as Record<string, unknown>
  const plan: Record<string, unknown>[]       = Array.isArray(task.plan) ? task.plan : []
  const timeline: Record<string, unknown>[]   = Array.isArray(task.timeline) ? task.timeline : []
  const execResults: Record<string, unknown>  = (task.execution_results as Record<string, unknown>) ?? {}
  const analysis                              = task.analysis ?? null

  // ── Build replay ─────────────────────────────────────────────────────────
  const replay: ReplayStep[] = plan.map((step, idx) => {
    const stepId = (step.id as string) ?? (step.step_id as string) ?? `step-${idx + 1}`
    const tool   = extractTool(step)

    // Find raw result — keyed by step_id, index, or tool
    const raw =
      execResults[stepId] ??
      execResults[String(idx)] ??
      execResults[tool] ??
      null

    const summary = raw ? summarise(raw) : ((step.result as string) ?? 'No result captured')

    // Find executed_at from timeline
    const event = timeline.find(
      e =>
        (e.step_id as string) === stepId ||
        (e.label as string)?.includes(tool) ||
        (e.label as string)?.includes((step.title as string) ?? ''),
    )
    const executed_at =
      (event?.timestamp as string) ??
      (step.completed_at as string) ??
      (data.updated_at as string) ??
      new Date().toISOString()

    return {
      step_id:        stepId,
      tool,
      executed_at,
      result_summary: summary,
      raw_result:     raw,
      evidence_hash:  evidenceHash(tool, summary, raw),
    }
  })

  // ── Verification ──────────────────────────────────────────────────────────
  // A step is "verified" when it has a non-null raw_result or a non-empty summary
  const verifiedSteps = replay.filter(
    s => s.raw_result !== null || (s.result_summary && s.result_summary !== 'No result captured'),
  ).length

  let integrity_status: Verification['integrity_status']
  if (verifiedSteps === 0)                      integrity_status = 'failed'
  else if (verifiedSteps === replay.length)     integrity_status = 'verified'
  else                                          integrity_status = 'partial'

  const verification: Verification = {
    verified_steps:   verifiedSteps,
    total_steps:      replay.length,
    integrity_status,
  }

  return NextResponse.json({
    task_id:           taskId,
    task: {
      goal:           task.goal,
      status:         task.status,
      execution_mode: task.execution_mode,
      updated_at:     task.updated_at ?? data.updated_at,
    },
    plan,
    timeline,
    execution_results: execResults,
    analysis,
    replay,
    verification,
  })
}
