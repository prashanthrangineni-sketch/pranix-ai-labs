import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '@/app/lib/control-plane'
import { callPranixTool } from '@/lib/pranix-mcp'
import {
  orchestrate,
  select_model,
  request_approval,
  write_memory,
  getModelRegistry,
  getRoutingTable,
  getModeGates,
  type TaskType,
  type FounderMode,
} from '@/lib/orchestrator'

export const dynamic = 'force-dynamic'

// ─── Types ─────────────────────────────────────────────────────

type OrchestrateRequest =
  | { action: 'run'; task_type: TaskType; prompt: string; system?: string; project: string; mode: FounderMode }
  | { action: 'select_model'; task_type: TaskType; mode?: FounderMode }
  | { action: 'request_approval'; description: string; resource_pattern: string; scope: 'read' | 'test' | 'write' | 'admin'; risk_level: 'low' | 'medium' | 'high' | 'critical'; context?: string }
  | { action: 'write_memory'; project: string; key: string; value: Record<string, unknown>; scope?: 'semantic' | 'episodic'; salience?: number }
  | { action: 'registry' }
  | { action: 'routing_table' }
  | { action: 'mode_gates' }

// ─── Auth ──────────────────────────────────────────────────────────

async function assertFounder(): Promise<{ ok: true; email: string; id?: string } | { ok: false }> {
  try {
    const supa = createServerClient()
    const { data: { user } } = await supa.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!email) return { ok: false }
    const { data } = await getControlPlane()
      .from('dashboard_founders').select('email, id').eq('email', email).maybeSingle()
    if (!data) return { ok: false }
    return { ok: true, email, id: (data as any).id }
  } catch {
    return { ok: false }
  }
}

// ─── Routing token helper ───────────────────────────────────────────

async function getToken(project: string): Promise<string> {
  const res = await callPranixTool<{ routing_token: string }>('mcp_route_task', {
    task_text: `Orchestrator task: ${project}`,
    _tool_input_summary: 'Auto-route for orchestrate API',
    _requires_user_approval: false,
  })
  return res.ok && res.data?.routing_token ? res.data.routing_token : 'rt_fallback'
}

// ─── GET — health check + registry ────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: '1.0.0',
    registry: getModelRegistry(),
    routing_table: getRoutingTable(),
    mode_gates: getModeGates(),
  })
}

// ─── POST — main dispatcher ───────────────────────────────────────────

export async function POST(req: Request) {
  const gate = await assertFounder()
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: OrchestrateRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  // ─ Read-only registry endpoints (no auth beyond founder check) ───

  if (body.action === 'registry') {
    return NextResponse.json({ ok: true, registry: getModelRegistry() })
  }

  if (body.action === 'routing_table') {
    return NextResponse.json({ ok: true, routing_table: getRoutingTable() })
  }

  if (body.action === 'mode_gates') {
    return NextResponse.json({ ok: true, mode_gates: getModeGates() })
  }

  if (body.action === 'select_model') {
    const model = await select_model(body.task_type, body.mode ?? 'autonomous')
    return NextResponse.json({ ok: true, model })
  }

  // ─ Approval routing (write to permission center) ──────────────

  if (body.action === 'request_approval') {
    const result = await request_approval({
      action: body.description,
      resource_pattern: body.resource_pattern,
      scope: body.scope,
      risk_level: body.risk_level,
      context: body.context,
    }, gate.id)
    return NextResponse.json({ ok: result.routed, ...result })
  }

  // ─ Memory write ─────────────────────────────────────────────

  if (body.action === 'write_memory') {
    const token = await getToken(body.project)
    const result = await write_memory(
      {
        project: body.project,
        key: body.key,
        value: body.value,
        scope: body.scope ?? 'episodic',
        salience: body.salience ?? 5,
      },
      token
    )
    return NextResponse.json({ ok: true, ...result })
  }

  // ─ Full orchestrated run ──────────────────────────────────────

  if (body.action === 'run') {
    const token = await getToken(body.project)
    const result = await orchestrate({
      task_type: body.task_type,
      prompt: body.prompt,
      system: body.system,
      project: body.project,
      mode: body.mode,
      routing_token: token,
    })
    return NextResponse.json({
      ok: result.ok,
      output: result.output,
      model: result.model,
      tokens_used: result.tokens_used,
      latency_ms: result.latency_ms,
      memory_key: result.memory_key,
      error: result.error,
    })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
