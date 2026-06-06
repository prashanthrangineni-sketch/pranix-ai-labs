import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '../../../lib/control-plane'

export const dynamic = 'force-dynamic'

// Key namespace inside execution_memory
// Stored as: project='pranix-dashboard', key='ask:task:<task_id>'
const PROJECT   = 'pranix-dashboard'
const KEY_NS    = 'ask:task:'
const TTL_HOURS = 168  // 7 days

async function assertFounder(): Promise<{ ok: boolean; email?: string }> {
  try {
    const supa  = createServerClient()
    const { data: { user } } = await supa.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!email) return { ok: false }
    const { data } = await getControlPlane()
      .from('dashboard_founders').select('email').eq('email', email).maybeSingle()
    if (!data) return { ok: false }
    return { ok: true, email }
  } catch {
    return { ok: false }
  }
}

// ─── GET /api/founder/timeline?workspace_id=<id>&limit=20 ──────────────────────
// Returns the N most recent persisted tasks for this workspace (or all if no ws filter).
export async function GET(req: NextRequest) {
  const gate = await assertFounder()
  if (!gate.ok) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspace_id') ?? undefined
  const limit       = Math.min(Number(searchParams.get('limit') ?? '20'), 50)

  try {
    const db = getControlPlane()
    let query = db
      .from('execution_memory')
      .select('id, key, value, created_at, expires_at')
      .eq('project', PROJECT)
      .like('key', `${KEY_NS}%`)
      .gt('expires_at', new Date().toISOString())   // exclude expired
      .order('created_at', { ascending: false })
      .limit(limit)

    if (workspaceId) {
      // Filter server-side: value->>'workspace_id' = workspaceId
      // Supabase supports PostgREST json operators via filter()
      query = query.filter('value->>workspace_id', 'eq', workspaceId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const tasks = (data ?? []).map(row => ({
      task_id:   row.key.replace(KEY_NS, ''),
      ...(row.value as Record<string, unknown>),
      persisted_at: row.created_at,
    }))

    return NextResponse.json({ tasks })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ─── POST /api/founder/timeline ────────────────────────────────────────────────
// Upserts a task snapshot into execution_memory.
// Body: { task_id, workspace_id, goal, execution_mode, status, plan, timeline }
export async function POST(req: NextRequest) {
  const gate = await assertFounder()
  if (!gate.ok) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const taskId = typeof body.task_id === 'string' ? body.task_id.trim() : ''
  if (!taskId || !/^[a-zA-Z0-9_-]{4,80}$/.test(taskId)) {
    return NextResponse.json({ error: 'task_id required (4-80 alphanumeric/dash/underscore chars)' }, { status: 400 })
  }

  const key     = `${KEY_NS}${taskId}`
  const expires = new Date(Date.now() + TTL_HOURS * 3_600_000).toISOString()
  const value   = {
    task_id:        taskId,
    workspace_id:   body.workspace_id   ?? null,
    goal:           body.goal           ?? '',
    execution_mode: body.execution_mode ?? 'plan',
    status:         body.status         ?? 'planned',
    plan:           body.plan           ?? [],
    timeline:       body.timeline       ?? [],
    updated_at:     new Date().toISOString(),
  }

  try {
    const db = getControlPlane()
    // execution_memory has a unique constraint on (project, key) — upsert on that
    const { error } = await db
      .from('execution_memory')
      .upsert(
        { project: PROJECT, key, value, expires_at: expires },
        { onConflict: 'project,key', ignoreDuplicates: false }
      )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, task_id: taskId, key })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
