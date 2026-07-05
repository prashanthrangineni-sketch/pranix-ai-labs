import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '../../../lib/control-plane'
import {
  readExecutionMemory,
  writeExecutionMemory,
  DEFAULT_EXECUTION_MEMORY_PROJECT,
  DEFAULT_EXECUTION_MEMORY_TTL_HOURS,
} from '../../../lib/execution-memory'

// Closes the auth gap flagged in PR #68: this endpoint used to have no
// founder-session check at all, matching its only two callers (modes/route.ts,
// execution/route.ts), which also called it unauthenticated over an internal
// fetch. Those two callers no longer go over HTTP at all - they now import
// readExecutionMemory/writeExecutionMemory from lib/execution-memory.ts
// directly - so this HTTP endpoint is only for external/browser callers and
// can safely require the same assertFounder() gate every other founder/*
// route uses (see app/api/founder/workspaces/route.ts).

export const dynamic = 'force-dynamic'

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

// GET /api/founder/execution-memory?key=X&project=Y (project optional)
export async function GET(req: NextRequest) {
  if (!(await assertFounder())) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  const project = searchParams.get('project') ?? DEFAULT_EXECUTION_MEMORY_PROJECT

  if (!key) {
    return NextResponse.json({ error: 'key_required' }, { status: 400 })
  }

  const value = await readExecutionMemory(project, key)
  return NextResponse.json({ value })
}

// POST /api/founder/execution-memory
// body: { key, value, project?, ttl_hours? }
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

  const key = typeof body.key === 'string' ? body.key : ''
  const project = typeof body.project === 'string' ? body.project : DEFAULT_EXECUTION_MEMORY_PROJECT
  const ttlHours = typeof body.ttl_hours === 'number' ? body.ttl_hours : DEFAULT_EXECUTION_MEMORY_TTL_HOURS

  if (!key) return NextResponse.json({ error: 'key_required' }, { status: 400 })
  if (!('value' in body)) return NextResponse.json({ error: 'value_required' }, { status: 400 })

  const ok = await writeExecutionMemory(project, key, body.value, ttlHours)
  if (!ok) return NextResponse.json({ error: 'write_failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
