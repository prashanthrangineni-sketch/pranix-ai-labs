// app/api/founder/roadmap/route.ts
// Canonical Founder OS Roadmap API
// Serves the static registry.json as the source of truth.
// POST allows status overrides to be persisted to execution_memory.
// The static JSON is deployment-durable; execution_memory overrides layer on top.

import { NextResponse }  from 'next/server'
import type { NextRequest } from 'next/server'
import registry          from './registry.json'

export type RoadmapStatus =
  | 'planned'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'cancelled'

export interface RoadmapItem {
  roadmap_id:   string
  phase_id:     string
  phase_type:   string
  title:        string
  objective:    string
  priority:     string
  status:       RoadmapStatus
  dependencies: string[]
  target_state: string
  notes:        string | null
  created_at:   string
  updated_at:   string
}

// ── Execution-memory override layer ───────────────────────────────────────────────

function base(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? ''
  return raw.startsWith('http') ? raw : `https://${raw}`
}

async function getOverrides(): Promise<Record<string, Partial<RoadmapItem>>> {
  try {
    const res = await fetch(
      `${base()}/api/founder/memory?project=pranix_agents&key=founder_os:roadmap:overrides`,
      { cache: 'no-store' }
    )
    if (!res.ok) return {}
    const j = await res.json() as { value?: Record<string, Partial<RoadmapItem>> }
    return j?.value ?? {}
  } catch { return {} }
}

async function setOverride(roadmapId: string, patch: Partial<RoadmapItem>): Promise<void> {
  const overrides = await getOverrides()
  overrides[roadmapId] = { ...(overrides[roadmapId] ?? {}), ...patch, updated_at: new Date().toISOString() }
  try {
    await fetch(`${base()}/api/founder/memory`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        project:   'pranix_agents',
        key:       'founder_os:roadmap:overrides',
        value:     overrides,
        ttl_hours: 8760,
      }),
      cache: 'no-store',
    })
  } catch { /* non-fatal */ }
}

// ── Progress computation ────────────────────────────────────────────────────────────

function computeProgress(items: RoadmapItem[]) {
  const total     = items.length
  const completed = items.filter(i => i.status === 'completed').length
  const in_progress = items.filter(i => i.status === 'in_progress').length
  const blocked   = items.filter(i => i.status === 'blocked').length
  const planned   = items.filter(i => i.status === 'planned').length
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0

  // Current phase: first in_progress, else first planned
  const current   = items.find(i => i.status === 'in_progress')
    ?? items.find(i => i.status === 'approved')
    ?? items.find(i => i.status === 'planned')
    ?? null

  // Next phase after current
  const currentIdx  = current ? items.indexOf(current) : -1
  const next        = currentIdx >= 0 && currentIdx + 1 < items.length
    ? items[currentIdx + 1]
    : null

  // Blocked phases
  const blockedItems = items.filter(i => i.status === 'blocked')

  // Strategic milestones (Vision-type or critical)
  const milestones = items.filter(i => i.phase_type === 'Vision' || i.priority === 'critical')

  return { total, completed, in_progress, blocked, planned, pct, current, next, blockedItems, milestones }
}

// ── GET /api/founder/roadmap ───────────────────────────────────────────────────────

export async function GET() {
  try {
    const overrides = await getOverrides()
    const items: RoadmapItem[] = (registry.roadmap as RoadmapItem[]).map(item => ({
      ...item,
      ...(overrides[item.roadmap_id] ?? {}),
    }))

    const progress = computeProgress(items)

    return NextResponse.json({
      schema_version:    registry.schema_version,
      completed_phases:  registry.completed_phases,
      roadmap:           items,
      progress: {
        total:       progress.total,
        completed:   progress.completed,
        in_progress: progress.in_progress,
        blocked:     progress.blocked,
        planned:     progress.planned,
        pct:         progress.pct,
        current:     progress.current,
        next:        progress.next,
        blocked_items:  progress.blockedItems,
        milestones:  progress.milestones,
      },
      generated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[roadmap] GET error:', err)
    return NextResponse.json({ error: 'Roadmap engine error' }, { status: 500 })
  }
}

// ── POST /api/founder/roadmap ───────────────────────────────────────────────────────
// Actions: update_status, add_note

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      action:     string
      roadmap_id: string
      status?:    RoadmapStatus
      notes?:     string
    }
    const { action, roadmap_id } = body

    if (!action || !roadmap_id) {
      return NextResponse.json({ error: 'action and roadmap_id required' }, { status: 400 })
    }

    const item = (registry.roadmap as RoadmapItem[]).find(i => i.roadmap_id === roadmap_id)
    if (!item) {
      return NextResponse.json({ error: `Unknown roadmap_id: ${roadmap_id}` }, { status: 404 })
    }

    if (action === 'update_status') {
      if (!body.status) return NextResponse.json({ error: 'status required' }, { status: 400 })
      await setOverride(roadmap_id, { status: body.status })
      return NextResponse.json({ ok: true, roadmap_id, status: body.status })
    }

    if (action === 'add_note') {
      if (!body.notes) return NextResponse.json({ error: 'notes required' }, { status: 400 })
      await setOverride(roadmap_id, { notes: body.notes })
      return NextResponse.json({ ok: true, roadmap_id, notes: body.notes })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    console.error('[roadmap] POST error:', err)
    return NextResponse.json({ error: 'Roadmap engine error' }, { status: 500 })
  }
}
