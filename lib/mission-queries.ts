// lib/mission-queries.ts — Mission Control Phase 1 read layer.
// Self-contained on purpose: no changes to lib/queries.ts, zero risk to existing pages.
// All reads go through the founder's RLS-gated session (see migrations/20260708_mission_control.sql).

import { createServerClient } from './supabase'

export interface Mission {
  id: string
  title: string
  intent: string | null
  product: string | null
  status: 'proposed' | 'active' | 'blocked' | 'completed' | 'cancelled'
  needs_founder: boolean
  founder_action: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface MissionStep {
  id: string
  mission_id: string
  seq: number
  title: string
  worker: string
  state: 'pending' | 'in_progress' | 'claimed_done' | 'verified' | 'failed' | 'cancelled'
  claim_note: string | null
  artifact_url: string | null
  created_at: string
  updated_at: string
}

export interface Verification {
  id: string
  mission_step_id: string
  worker: string
  verifier: string
  verdict: 'pass' | 'fail' | 'mismatch'
  evidence_url: string | null
  evidence_note: string | null
  created_at: string
}

export interface WorkerHeartbeat {
  worker: string
  status: 'idle' | 'working' | 'blocked' | 'offline'
  current_task: string | null
  last_seen_at: string
}

export async function getMissions(): Promise<Mission[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('missions')
    .select('id, title, intent, product, status, needs_founder, founder_action, created_by, created_at, updated_at')
    .order('needs_founder', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(100)
  if (error || !data) return []
  return data as Mission[]
}

export async function getMissionSteps(): Promise<MissionStep[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('mission_steps')
    .select('id, mission_id, seq, title, worker, state, claim_note, artifact_url, created_at, updated_at')
    .order('seq', { ascending: true })
    .limit(500)
  if (error || !data) return []
  return data as MissionStep[]
}

export async function getRecentVerifications(): Promise<Verification[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('verifications')
    .select('id, mission_step_id, worker, verifier, verdict, evidence_url, evidence_note, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error || !data) return []
  return data as Verification[]
}

export async function getWorkerHeartbeats(): Promise<WorkerHeartbeat[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('worker_heartbeats')
    .select('worker, status, current_task, last_seen_at')
    .order('worker', { ascending: true })
  if (error || !data) return []
  return data as WorkerHeartbeat[]
}
