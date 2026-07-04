import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '../../../lib/control-plane'
import { randomUUID } from 'crypto'

// Fix for "Could not load workspaces" on /founder/ask: the client component
// (WorkspaceSidebar.tsx) used to fetch https://pranix-agent-engine.vercel.app/api/workspaces
// directly from the browser - a cross-origin call to a separate Vercel deployment,
// unlike every other founder/* data source which proxies through a same-origin
// Next.js route querying the shared control-plane execution_memory table directly
// (see app/api/founder/overview/route.ts, app/api/founder/timeline/route.ts).
// This route follows that same established pattern instead.

export const dynamic = 'force-dynamic'

// Same schema/namespace as pranix-agent-engine's lib/workspace.js, so existing
// workspace rows created via the agent-engine's own API remain visible here.
const WORKSPACE_PROJECT = 'pranix_workspaces'
const TTL_DAYS = 30
const DEFAULT_WORKSPACES = ['General', 'EdGridAI', 'Cart2Save', 'EdProSys']

function expiresAt(days = TTL_DAYS) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

async function assertFounder(): Promise<boolean> {
  try {
    const supa = createServerClient()
    const { data: { user } } = await supa.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!email) return false
    const cp = getControlPlane()
    const { data } = await cp
      .from('dashboard_founders').select('email').eq('email', email).maybeSingle()
    return !!data
  } catch {
    return false
  }
}

type WorkspaceMeta = {
  id: string
  name: string
  project: string | null
  model: string
  created_at: string
  last_msg_at: string
  message_count: number
}

// ─── GET /api/founder/workspaces ────────────────────────────────────────────
// Lists workspaces; auto-seeds a few defaults on first load so the sidebar
// is never permanently empty for a brand-new founder account.
export async function GET() {
  if (!(await assertFounder())) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  try {
    const db = getControlPlane()
    const { data, error } = await db
      .from('execution_memory')
      .select('key, value, created_at')
      .eq('project', WORKSPACE_PROJECT)
      .like('key', 'workspace:meta:%')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let workspaces = (data ?? [])
      .map((row) => {
        const v = row.value as Partial<WorkspaceMeta> | null
        return {
          workspace_id: v?.id,
          name: v?.name ?? 'Untitled',
          project: v?.project ?? null,
          model: v?.model ?? 'auto',
          created_at: v?.created_at ?? row.created_at,
          last_msg_at: v?.last_msg_at ?? row.created_at,
          message_count: v?.message_count ?? 0,
        }
      })
      .filter((w) => w.workspace_id)

    if (workspaces.length === 0) {
      const now = new Date().toISOString()
      const rows = DEFAULT_WORKSPACES.map((name) => {
        const id = randomUUID()
        const meta: WorkspaceMeta = {
          id,
          name,
          project: null,
          model: 'auto',
          created_at: now,
          last_msg_at: now,
          message_count: 0,
        }
        return {
          key: `workspace:meta:${id}`,
          project: WORKSPACE_PROJECT,
          value: meta,
          expires_at: expiresAt(),
          created_at: now,
        }
      })
      const { error: seedError } = await db
        .from('execution_memory')
        .upsert(rows, { onConflict: 'key,project' })
      if (!seedError) {
        workspaces = rows.map((r) => ({
          workspace_id: r.value.id,
          name: r.value.name,
          project: r.value.project,
          model: r.value.model,
          created_at: r.value.created_at,
          last_msg_at: r.value.last_msg_at,
          message_count: 0,
        }))
      }
    }

    return NextResponse.json({ workspaces })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ─── POST /api/founder/workspaces ───────────────────────────────────────────
// Creates a new workspace.
export async function POST(req: NextRequest) {
  if (!(await assertFounder())) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })

  const workspace_id = randomUUID()
  const now = new Date().toISOString()
  const meta: WorkspaceMeta = {
    id: workspace_id,
    name,
    project: typeof body.project === 'string' ? body.project : null,
    model: typeof body.model === 'string' ? body.model : 'auto',
    created_at: now,
    last_msg_at: now,
    message_count: 0,
  }

  try {
    const db = getControlPlane()
    const { error } = await db.from('execution_memory').upsert(
      {
        key: `workspace:meta:${workspace_id}`,
        project: WORKSPACE_PROJECT,
        value: meta,
        expires_at: expiresAt(),
        created_at: now,
      },
      { onConflict: 'key,project' }
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ workspace_id, meta }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
