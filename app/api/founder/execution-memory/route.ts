import { NextRequest, NextResponse } from 'next/server'
import { getControlPlane } from '../../../lib/control-plane'

// Fix for the "Operating Mode: Change" button failing on /founder/settings:
// app/api/founder/modes/route.ts (P9) and app/api/founder/execution/route.ts
// (P11) both call this endpoint as their execution_memory persistence layer,
// but it never existed in the repo - so mode changes silently failed to
// persist (each caller's own try/catch swallowed the resulting 404) and
// P11's execution-eligibility cache never wrote either.
//
// Implements the same execution_memory table access pattern already used by
// app/api/founder/workspaces/route.ts: read/write a row in the shared
// control-plane `execution_memory` table, keyed on (project, key).
//
// Internal, server-to-server endpoint only (called by other route handlers
// via fetch, not by the browser directly) - no independent founder-session
// gate, matching the existing P9/P11 callers, which also call it without
// forwarding cookies. If this needs to be safely reachable from outside the
// app's own server-to-server calls, add auth before exposing it further.

export const dynamic = 'force-dynamic'

const DEFAULT_PROJECT = 'pranix'
const DEFAULT_TTL_HOURS = 24

function expiresAt(hours: number) {
  const d = new Date()
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

// GET /api/founder/execution-memory?key=X&project=Y (project optional)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  const project = searchParams.get('project') ?? DEFAULT_PROJECT

  if (!key) {
    return NextResponse.json({ error: 'key_required' }, { status: 400 })
  }

  try {
    const db = getControlPlane()
    const { data, error } = await db
      .from('execution_memory')
      .select('value, expires_at')
      .eq('project', project)
      .eq('key', key)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ value: data?.value ?? null })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/founder/execution-memory
// body: { key, value, project?, ttl_hours? }
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const key = typeof body.key === 'string' ? body.key : ''
  const project = typeof body.project === 'string' ? body.project : DEFAULT_PROJECT
  const ttlHours = typeof body.ttl_hours === 'number' ? body.ttl_hours : DEFAULT_TTL_HOURS

  if (!key) return NextResponse.json({ error: 'key_required' }, { status: 400 })
  if (!('value' in body)) return NextResponse.json({ error: 'value_required' }, { status: 400 })

  try {
    const db = getControlPlane()
    const { error } = await db.from('execution_memory').upsert(
      {
        key,
        project,
        value: body.value,
        expires_at: expiresAt(ttlHours),
        created_at: new Date().toISOString(),
      },
      { onConflict: 'key,project' }
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
