'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '@/app/lib/control-plane'
import type { PersistedTask } from '../ask/ask-chat'

const PROJECT = 'pranix-dashboard'
const KEY_NS  = 'ask:task:'
const TTL_MS  = 168 * 3_600_000  // 7 days

async function assertFounder(): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  try {
    const supa = createServerClient()
    const { data: { user } } = await supa.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!email) return { ok: false, message: 'Not signed in' }
    const { data } = await getControlPlane()
      .from('dashboard_founders').select('email').eq('email', email).maybeSingle()
    if (!data) return { ok: false, message: 'Not authorized' }
    return { ok: true, email }
  } catch {
    return { ok: false, message: 'Authorization check failed' }
  }
}

export type AgentTaskDecisionState = {
  ok: boolean
  message: string
  task_id?: string
}

// ── Shared upsert ──────────────────────────────────────────────────────────
async function applyDecision(
  taskId: string,
  newStatus: 'approved' | 'rejected',
  gate: { ok: true; email: string },
): Promise<AgentTaskDecisionState> {
  const cp  = getControlPlane()
  const key = `${KEY_NS}${taskId}`

  // 1. Read current snapshot
  const { data: row, error: readErr } = await cp
    .from('execution_memory')
    .select('value')
    .eq('project', PROJECT)
    .eq('key', key)
    .maybeSingle()

  if (readErr) return { ok: false, message: readErr.message, task_id: taskId }
  if (!row)    return { ok: false, message: 'Task not found', task_id: taskId }

  const snapshot = row.value as PersistedTask

  // 2. Build updated value
  const timeline = [
    ...(snapshot.timeline ?? []),
    {
      id:        `${newStatus}-${Date.now()}`,
      kind:      newStatus === 'approved' ? 'approved' : 'failed',
      label:     newStatus === 'approved'
        ? `Plan approved by ${gate.email}`
        : `Plan rejected by ${gate.email}`,
      timestamp: new Date().toISOString(),
    },
  ]

  const updatedValue: PersistedTask = {
    ...snapshot,
    status:         newStatus === 'approved' ? 'approved' : 'failed',
    execution_mode: newStatus === 'approved' ? 'executing' : 'completed',
    timeline,
    updated_at: new Date().toISOString(),
  }

  // 3. Upsert back
  const { error: writeErr } = await cp
    .from('execution_memory')
    .upsert(
      { project: PROJECT, key, value: updatedValue, expires_at: new Date(Date.now() + TTL_MS).toISOString() },
      { onConflict: 'project,key', ignoreDuplicates: false },
    )

  if (writeErr) return { ok: false, message: writeErr.message, task_id: taskId }

  // Fire execution immediately after approval (fire-and-forget, does not block response)
  if (newStatus === 'approved') {
    const base = process.env.NEXT_PUBLIC_APP_URL ??
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
    fetch(`${base}/api/founder/execute`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      // Pass the cookie header so the execute route can assertFounder()
      body: JSON.stringify({ task_id: taskId, workspace_id: snapshot.workspace_id }),
    }).catch(() => { /* fire-and-forget — polling will surface state */ })
  }

  revalidatePath('/founder/approvals')
  revalidatePath('/founder')
  return { ok: true, message: newStatus === 'approved' ? 'Task approved — execution started' : 'Task rejected', task_id: taskId }
}

// ── Public server actions ───────────────────────────────────────────────────────
export async function approveAgentTask(
  _prev: AgentTaskDecisionState | null,
  formData: FormData,
): Promise<AgentTaskDecisionState> {
  const taskId = String(formData.get('task_id') ?? '').trim()
  if (!taskId) return { ok: false, message: 'Missing task_id' }
  const gate = await assertFounder()
  if (!gate.ok) return { ok: false, message: gate.message, task_id: taskId }
  return applyDecision(taskId, 'approved', gate)
}

export async function rejectAgentTask(
  _prev: AgentTaskDecisionState | null,
  formData: FormData,
): Promise<AgentTaskDecisionState> {
  const taskId = String(formData.get('task_id') ?? '').trim()
  if (!taskId) return { ok: false, message: 'Missing task_id' }
  const gate = await assertFounder()
  if (!gate.ok) return { ok: false, message: gate.message, task_id: taskId }
  return applyDecision(taskId, 'rejected', gate)
}

// ── Data fetcher (used by the page Server Component) ────────────────────────────
export async function getAgentTaskInbox(): Promise<{
  pending: PersistedTask[]
  history: PersistedTask[]
}> {
  try {
    const cp = getControlPlane()
    const { data, error } = await cp
      .from('execution_memory')
      .select('key, value, created_at')
      .eq('project', PROJECT)
      .like('key', `${KEY_NS}%`)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    if (error || !data) return { pending: [], history: [] }

    const tasks = data.map(row => ({
      ...(row.value as PersistedTask),
      task_id: (row.value as PersistedTask).task_id ||
        (row.key as string).replace(KEY_NS, ''),
    }))

    const pending = tasks.filter(t =>
      t.status === 'planned' || t.status === 'approved' ||
      (t.execution_mode === 'plan' && t.status !== 'failed' && t.status !== 'completed')
    )
    const history = tasks.filter(t =>
      t.status === 'completed' || t.status === 'failed'
    )

    return { pending, history }
  } catch {
    return { pending: [], history: [] }
  }
}
