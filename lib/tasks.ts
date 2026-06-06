/**
 * Pranix Task Persistence
 *
 * Every execution creates a task_id tracked in execution_memory.
 * Tasks survive browser refresh, session end, and model switches.
 *
 * Stored under key pattern: task:{task_id}
 * Project: 'pranix-os'
 */

import { getControlPlane } from '@/app/lib/control-plane'
import type { IntentKind } from '@/app/api/founder/ask/route'

export type TaskStatus = 'pending' | 'running' | 'awaiting_approval' | 'done' | 'failed' | 'cancelled'

export type TaskStep = {
  step: number
  label: string
  tool: string
  status: 'pending' | 'running' | 'done' | 'skipped' | 'failed'
  started_at?: string
  completed_at?: string
  result_summary?: string
}

export type FounderTask = {
  task_id: string
  message: string                // original founder message
  intent: IntentKind
  project?: string
  status: TaskStatus
  current_step: number
  total_steps: number
  steps: TaskStep[]
  model_used?: string
  owner: string                  // founder email
  created_at: string
  updated_at: string
  result_title?: string
  result_lines?: string[]
  result_link?: string
  error?: string
}

function taskKey(taskId: string) { return `task:${taskId}` }

function newTaskId(): string {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ─── Write ────────────────────────────────────────────────────────

export async function createTask(
  message: string,
  intent: IntentKind,
  owner: string,
  steps: TaskStep[],
  project?: string,
): Promise<FounderTask> {
  const db = getControlPlane()
  const now = new Date().toISOString()
  const task: FounderTask = {
    task_id: newTaskId(),
    message,
    intent,
    project,
    status: 'running',
    current_step: 0,
    total_steps: steps.length,
    steps,
    owner,
    created_at: now,
    updated_at: now,
  }

  await db.from('execution_memory').upsert({
    project: 'pranix-os',
    key: taskKey(task.task_id),
    value: task as unknown as Record<string, unknown>,
    ttl_hours: 168, // 7 days
  }, { onConflict: 'project,key' })

  return task
}

export async function updateTask(
  taskId: string,
  patch: Partial<Pick<FounderTask, 'status' | 'current_step' | 'steps' | 'result_title' | 'result_lines' | 'result_link' | 'model_used' | 'error'>>,
): Promise<void> {
  const db = getControlPlane()
  const existing = await readTask(taskId)
  if (!existing) return

  const updated: FounderTask = {
    ...existing,
    ...patch,
    updated_at: new Date().toISOString(),
  }

  await db.from('execution_memory').upsert({
    project: 'pranix-os',
    key: taskKey(taskId),
    value: updated as unknown as Record<string, unknown>,
    ttl_hours: 168,
  }, { onConflict: 'project,key' })
}

// ─── Read ─────────────────────────────────────────────────────────

export async function readTask(taskId: string): Promise<FounderTask | null> {
  const db = getControlPlane()
  const { data } = await db
    .from('execution_memory')
    .select('value')
    .eq('project', 'pranix-os')
    .eq('key', taskKey(taskId))
    .maybeSingle()
  return (data?.value as unknown as FounderTask) ?? null
}

export async function listRecentTasks(owner: string, limit = 30): Promise<FounderTask[]> {
  const db = getControlPlane()
  const { data } = await db
    .from('execution_memory')
    .select('value, created_at')
    .eq('project', 'pranix-os')
    .like('key', 'task:%')
    .order('created_at', { ascending: false })
    .limit(limit)

  return ((data ?? [])
    .map(r => r.value as unknown as FounderTask)
    .filter(t => t?.owner === owner || !t?.owner) // show all if no owner filter available
  )
}

// ─── Timeline event (for live updates) ──────────────────────────────

export type TimelineEvent = {
  event_id: string
  task_id: string
  ts: string          // ISO
  label: string
  kind: 'step' | 'approval' | 'result' | 'error'
}

export async function appendTimelineEvent(taskId: string, event: Omit<TimelineEvent, 'event_id' | 'ts'>): Promise<void> {
  const db = getControlPlane()
  const key = `timeline:${taskId}`
  const { data: existing } = await db
    .from('execution_memory')
    .select('value')
    .eq('project', 'pranix-os')
    .eq('key', key)
    .maybeSingle()

  const events: TimelineEvent[] = (existing?.value as any)?.events ?? []
  events.push({
    event_id: `ev_${Date.now()}`,
    task_id: taskId,
    ts: new Date().toISOString(),
    ...event,
  })

  await db.from('execution_memory').upsert({
    project: 'pranix-os',
    key,
    value: { events } as Record<string, unknown>,
    ttl_hours: 168,
  }, { onConflict: 'project,key' })
}

export async function readTimeline(taskId: string): Promise<TimelineEvent[]> {
  const db = getControlPlane()
  const { data } = await db
    .from('execution_memory')
    .select('value')
    .eq('project', 'pranix-os')
    .eq('key', `timeline:${taskId}`)
    .maybeSingle()
  return (data?.value as any)?.events ?? []
}
