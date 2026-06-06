// app/api/founder/overview/route.ts
// P4 — Founder Mission Control: aggregates task state, provider health,
// recent decisions, risks, and recommendations from execution_memory.
// READ-ONLY. No writes. No new DB tables.

import { NextResponse }      from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane }   from '@/app/lib/control-plane'
import type { PersistedTask } from '@/app/founder/ask/ask-chat'

export const runtime    = 'nodejs'
export const dynamic    = 'force-dynamic'
export const revalidate = 0

const PROJECT  = 'pranix-dashboard'
const TASK_NS  = 'ask:task:'

async function assertFounder(): Promise<boolean> {
  try {
    const supa  = createServerClient()
    const { data: { user } } = await supa.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!email) return false
    const cp = getControlPlane()
    const { data } = await cp
      .from('dashboard_founders').select('email').eq('email', email).maybeSingle()
    return !!data
  } catch { return false }
}

export async function GET() {
  if (!await assertFounder())
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cp = getControlPlane()

  // ── 1. Load all tasks from execution_memory ──────────────────────────────
  const { data: taskRows } = await cp
    .from('execution_memory')
    .select('key, value, created_at')
    .eq('project', PROJECT)
    .like('key', `${TASK_NS}%`)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(100)

  const tasks: PersistedTask[] = (taskRows ?? []).map(r => ({
    ...(r.value as PersistedTask),
    task_id: (r.value as PersistedTask).task_id ||
      (r.key as string).replace(TASK_NS, ''),
  }))

  const now   = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const pendingApprovals = tasks.filter(t =>
    t.status === 'planned' &&
    (t.execution_mode === 'plan' || t.execution_mode === 'approval_required')
  )
  const activeTasks = tasks.filter(t =>
    t.status === 'approved' || t.status === 'executing'
  )
  const failedTasks = tasks.filter(t => t.status === 'failed')
  const completedToday = tasks.filter(t =>
    t.status === 'completed' &&
    t.updated_at && new Date(t.updated_at) >= todayStart
  )

  // ── 2. Provider health ──────────────────────────────────────────────────
  const { data: providerRows } = await cp
    .from('orchestration_providers')
    .select('provider_name, health_status, updated_at')
    .order('provider_name')
    .limit(20)

  const providers = (providerRows ?? []).map(p => ({
    name:   p.provider_name as string,
    status: p.health_status as string,
    updated_at: p.updated_at as string,
  }))

  // ── 3. Founder feed — extract timeline events from all tasks ────────────
  type FeedItem = {
    id: string
    kind: string
    label: string
    sub: string
    timestamp: string
    task_id: string
  }
  const feedItems: FeedItem[] = []
  for (const t of tasks.slice(0, 30)) {
    for (const ev of t.timeline ?? []) {
      feedItems.push({
        id:        ev.id ?? `${t.task_id}-${ev.kind}`,
        kind:      ev.kind,
        label:     ev.label,
        sub:       t.title ?? t.goal ?? '',
        timestamp: ev.timestamp,
        task_id:   t.task_id,
      })
    }
  }
  feedItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // ── 4. Decisions, risks, recommendations (from analysis blocks) ──────────
  type Decision = { task_id: string; decision: string; reasoning: string; timestamp: string }
  type Risk      = { task_id: string; risk: string; timestamp: string }
  type Rec       = { task_id: string; recommendation: string; timestamp: string }
  const decisions: Decision[] = []
  const risks:     Risk[]     = []
  const recs:      Rec[]      = []

  for (const t of tasks.slice(0, 20)) {
    const a = t.analysis
    if (!a) continue
    if (a.decision) {
      decisions.push({
        task_id:    t.task_id,
        decision:   a.decision,
        reasoning:  a.reasoning ?? '',
        timestamp:  t.updated_at ?? t.created_at ?? '',
      })
    }
    for (const r of a.risks ?? []) {
      risks.push({ task_id: t.task_id, risk: r, timestamp: t.updated_at ?? t.created_at ?? '' })
    }
    for (const r of a.recommendations ?? []) {
      recs.push({ task_id: t.task_id, recommendation: r, timestamp: t.updated_at ?? t.created_at ?? '' })
    }
  }

  // ── 5. Morning Focus ─────────────────────────────────────────────────────
  const morningFocus: string[] = []
  if (pendingApprovals.length > 0)
    morningFocus.push(`${pendingApprovals.length} pending approval${pendingApprovals.length > 1 ? 's' : ''}`)
  if (activeTasks.length > 0)
    morningFocus.push(`${activeTasks.length} task${activeTasks.length > 1 ? 's' : ''} executing`)
  if (completedToday.length > 0)
    morningFocus.push(`${completedToday.length} completed today`)
  if (failedTasks.length > 0)
    morningFocus.push(`${failedTasks.length} failed — needs review`)
  if (risks.length > 0)
    morningFocus.push(`${risks.length} risk${risks.length > 1 ? 's' : ''} detected`)
  const offlineProviders = providers.filter(p =>
    p.status === 'offline' || p.status === 'disabled_billing_required'
  )
  if (offlineProviders.length > 0)
    morningFocus.push(`${offlineProviders.length} provider${offlineProviders.length > 1 ? 's' : ''} offline`)
  if (morningFocus.length === 0)
    morningFocus.push('All clear — no actions required')

  return NextResponse.json({
    approvals:       pendingApprovals.map(t => ({
      task_id:   t.task_id,
      title:     t.title ?? t.goal ?? 'Agent task',
      goal:      t.goal ?? '',
      created_at: t.created_at,
    })),
    active_tasks:    activeTasks.map(t => ({
      task_id:   t.task_id,
      title:     t.title ?? t.goal ?? 'Agent task',
      status:    t.status,
      created_at: t.created_at,
    })),
    failures:        failedTasks.slice(0, 5).map(t => ({
      task_id:   t.task_id,
      title:     t.title ?? t.goal ?? 'Agent task',
      updated_at: t.updated_at,
    })),
    completed_today: completedToday.length,
    providers,
    feed:            feedItems.slice(0, 20),
    decisions:       decisions.slice(0, 10),
    risks:           risks.slice(0, 10),
    recommendations: recs.slice(0, 10),
    morning_focus:   morningFocus,
    generated_at:    new Date().toISOString(),
  })
}
