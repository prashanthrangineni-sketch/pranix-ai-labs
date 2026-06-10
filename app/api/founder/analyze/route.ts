import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '../../../lib/control-plane'
import type { PlanStep, TimelineEvent, PersistedTask } from '@/app/founder/ask/ask-chat'

export const dynamic    = 'force-dynamic'
export const maxDuration = 30

const PROJECT   = 'pranix-dashboard'
const KEY_NS    = 'ask:task:'
const TTL_HOURS = 168

// ── Types ─────────────────────────────────────────────────────────────────────
export type FounderDecision =
  | 'approve_next_step'
  | 'investigate_further'
  | 'no_action_required'
  | 'blocked_missing_data'

export type ConfidenceLevel = 'High' | 'Medium' | 'Low'
export type EvidenceQuality = 'Strong' | 'Partial' | 'Weak'

export type TaskAnalysis = {
  executive_summary: string
  findings:          string[]
  risks:             string[]
  recommendations:   string[]
  confidence:        ConfidenceLevel
  evidence_quality:  EvidenceQuality
  founder_decision:  FounderDecision
  analyzed_at:       string
}

type RichStep = PlanStep & {
  result_summary?: string
  raw_result?:     unknown
  started_at?:     string
  completed_at?:   string
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function assertFounder(): Promise<{ ok: boolean }> {
  try {
    const supa = createServerClient()
    const { data: { user } } = await supa.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!email) return { ok: false }
    const { data } = await getControlPlane()
      .from('dashboard_founders').select('email').eq('email', email).maybeSingle()
    return data ? { ok: true } : { ok: false }
  } catch { return { ok: false } }
}

// ── Storage helpers ────────────────────────────────────────────────────────────
async function loadSnapshot(taskId: string): Promise<PersistedTask | null> {
  const { data } = await getControlPlane()
    .from('execution_memory')
    .select('value')
    .eq('project', PROJECT)
    .eq('key', `${KEY_NS}${taskId}`)
    .maybeSingle()
  return data ? (data.value as PersistedTask) : null
}

async function saveSnapshot(snapshot: PersistedTask & { analysis?: TaskAnalysis }): Promise<void> {
  await getControlPlane()
    .from('execution_memory')
    .upsert(
      {
        project:    PROJECT,
        key:        `${KEY_NS}${snapshot.task_id}`,
        value:      snapshot,
        expires_at: new Date(Date.now() + TTL_HOURS * 3_600_000).toISOString(),
      },
      { onConflict: 'project,key', ignoreDuplicates: false },
    )
}

// ── Confidence derivation ─────────────────────────────────────────────────────
function deriveConfidence(steps: RichStep[]): { confidence: ConfidenceLevel; evidence_quality: EvidenceQuality } {
  const total     = steps.length
  if (total === 0) return { confidence: 'Low', evidence_quality: 'Weak' }

  const completed = steps.filter(s => s.status === 'completed')
  const failed    = steps.filter(s => s.status === 'failed')
  const withEvidence = completed.filter(s => s.result_summary && !s.result_summary.includes('unavailable') && !s.result_summary.includes('blocked') && !s.result_summary.includes('inferred'))

  const completionRate = completed.length / total
  const evidenceRate   = withEvidence.length / Math.max(completed.length, 1)

  const confidence: ConfidenceLevel =
    completionRate >= 0.9 && evidenceRate >= 0.7 ? 'High'   :
    completionRate >= 0.6 || (failed.length === 0 && completed.length > 0) ? 'Medium' :
    'Low'

  const evidence_quality: EvidenceQuality =
    evidenceRate >= 0.7 ? 'Strong' :
    evidenceRate >= 0.4 ? 'Partial' :
    'Weak'

  return { confidence, evidence_quality }
}

// ── Analysis engine ───────────────────────────────────────────────────────────
function analyzeEvidence(snapshot: PersistedTask): TaskAnalysis {
  const steps     = (snapshot.plan ?? []) as RichStep[]
  const timeline  = snapshot.timeline ?? []
  const goal      = snapshot.goal ?? 'Unknown task'
  const completed = steps.filter(s => s.status === 'completed')
  const failed    = steps.filter(s => s.status === 'failed')
  const blocked   = steps.filter(s => s.result_summary?.includes('blocked') || s.result_summary?.includes('not in read-only allowlist'))
  const inferred  = steps.filter(s => s.result_summary?.includes('inferred') || s.result_summary?.includes('unavailable'))

  const { confidence, evidence_quality } = deriveConfidence(steps)

  // ── Findings ─────────────────────────────────────────────────────────────
  const findings: string[] = []

  if (completed.length > 0) {
    findings.push(`${completed.length} of ${steps.length} step${steps.length !== 1 ? 's' : ''} completed successfully`)
  }
  if (failed.length > 0) {
    findings.push(`${failed.length} step${failed.length !== 1 ? 's' : ''} failed: ${failed.map(s => s.title).join(', ')}`)
  }

  // Parse evidence summaries for domain-specific findings
  for (const s of completed) {
    const rs = s.result_summary ?? ''

    // Vercel deployment findings
    if (rs.includes('READY') || rs.includes('ready')) {
      findings.push(`Deployment healthy — ${rs.slice(0, 100)}`)
    } else if (rs.includes('ERROR') || rs.includes('FAILED')) {
      findings.push(`Deployment issue detected — ${rs.slice(0, 100)}`)
    }

    // Supabase findings
    if (rs.match(/\d+ table/i)) {
      findings.push(`Database: ${rs.slice(0, 120)}`)
    }

    // GitHub repo findings
    if (rs.match(/\d+ file/i) || rs.includes('tree')) {
      findings.push(`Repository: ${rs.slice(0, 120)}`)
    }

    // Doppler findings
    if (rs.match(/\d+ secret/i) || rs.match(/\d+ Doppler project/i)) {
      findings.push(`Secrets: ${rs.slice(0, 120)}`)
    }
    if (rs.match(/\d+ missing|\d+ extra/i)) {
      findings.push(`Config drift detected — ${rs.slice(0, 120)}`)
    }

    // Runtime log findings
    if (rs.match(/\d+ recent entries/i) || rs.match(/runtime logs/i)) {
      findings.push(`Runtime logs: ${rs.slice(0, 100)}`)
    }
  }

  if (blocked.length > 0) {
    findings.push(`${blocked.length} step${blocked.length !== 1 ? 's' : ''} skipped (write tool blocked by read-only safety guard)`)
  }
  if (inferred.length > 0 && inferred.length < steps.length) {
    findings.push(`${inferred.length} step${inferred.length !== 1 ? 's' : ''} used inferred results (MCP gateway unreachable)`)
  }

  const eventCount = timeline.length
  if (eventCount > 0) {
    const start = timeline.find(e => e.kind === 'executing')
    const end   = timeline.slice().reverse().find(e => e.kind === 'completed' || e.kind === 'failed')
    if (start && end) {
      const ms = new Date(end.timestamp).getTime() - new Date(start.timestamp).getTime()
      findings.push(`Execution duration: ${(ms / 1000).toFixed(1)}s across ${eventCount} timeline event${eventCount !== 1 ? 's' : ''}`)
    }
  }

  // Remove duplicates, cap at 8
  const uniqueFindings = [...new Set(findings)].slice(0, 8)

  // ── Risks ────────────────────────────────────────────────────────────────
  const risks: string[] = []

  if (failed.length > 0) {
    risks.push(`${failed.length} execution failure${failed.length !== 1 ? 's' : ''} require investigation before proceeding`)
  }
  if (inferred.length >= steps.length / 2) {
    risks.push('Majority of results are inferred — MCP gateway connectivity should be verified')
  }
  if (confidence === 'Low') {
    risks.push('Low confidence — evidence is incomplete; founder should review raw results before acting')
  }
  if (blocked.length > 0) {
    risks.push(`${blocked.length} step${blocked.length !== 1 ? 's' : ''} required write access — those actions remain pending approval`)
  }
  // Check for drift evidence
  const driftStep = completed.find(s => s.result_summary?.match(/\d+ missing|\d+ extra/i))
  if (driftStep) {
    risks.push('Config drift detected between environments — secret parity should be resolved before next deploy')
  }
  // Check for empty runtime logs
  const runtimeStep = completed.find(s => s.result_summary?.match(/runtime logs/i) && s.result_summary?.match(/0 recent entries/i))
  if (runtimeStep) {
    risks.push('No runtime log entries found — monitoring may be inactive or project has no recent traffic')
  }

  if (risks.length === 0) risks.push('No critical risks identified in read-only evidence')

  // ── Recommendations ───────────────────────────────────────────────────────
  const recs: string[] = []

  if (failed.length > 0) {
    recs.push(`Re-run failed step${failed.length !== 1 ? 's' : ''} (${failed.map(s => s.title).slice(0, 2).join(', ')}) with debugging enabled`)
  }
  if (driftStep) {
    recs.push('Sync Doppler dev/prod configs — add missing secrets to the target environment')
  }
  if (blocked.length > 0) {
    recs.push('Request write grant for blocked steps if the proposed changes are approved')
  }
  if (inferred.length > 0) {
    recs.push('Verify Pranix MCP gateway connectivity (PRANIX_GATEWAY_URL env var) for live evidence')
  }
  if (confidence === 'High' && failed.length === 0) {
    recs.push('Evidence is complete — safe to proceed with next planned actions')
  }
  if (recs.length === 0) {
    recs.push('No immediate action required — review findings and approve next step when ready')
  }

  // ── Executive Summary ─────────────────────────────────────────────────────
  let executive_summary: string
  if (failed.length === 0 && completed.length === steps.length && confidence === 'High') {
    executive_summary = `All ${steps.length} step${steps.length !== 1 ? 's' : ''} completed successfully with ${evidence_quality.toLowerCase()} evidence. ${goal.slice(0, 80)} — system is healthy and ready for next action.`
  } else if (failed.length === 0 && completed.length === steps.length) {
    executive_summary = `Execution completed: ${completed.length} step${completed.length !== 1 ? 's' : ''} finished. Evidence quality is ${evidence_quality.toLowerCase()}. ${risks[0] ?? 'Review findings before proceeding.'}`
  } else if (failed.length > 0) {
    executive_summary = `Execution partially completed: ${completed.length}/${steps.length} steps succeeded, ${failed.length} failed. Investigate failed step${failed.length !== 1 ? 's' : ''} before proceeding.`
  } else {
    executive_summary = `Execution in progress or incomplete. ${completed.length} of ${steps.length} step${steps.length !== 1 ? 's' : ''} have results. Confidence: ${confidence}.`
  }

  // ── Founder Decision ──────────────────────────────────────────────────────
  const founder_decision: FounderDecision =
    (inferred.length >= steps.length * 0.8)                                    ? 'blocked_missing_data' :
    (failed.length > 0 || driftStep || confidence === 'Low')                   ? 'investigate_further'  :
    (confidence === 'High' && failed.length === 0 && completed.length > 0)     ? 'approve_next_step'    :
    (completed.length === steps.length && failed.length === 0)                 ? 'no_action_required'   :
    'investigate_further'

  return {
    executive_summary,
    findings:         uniqueFindings,
    risks:            risks.slice(0, 5),
    recommendations:  recs.slice(0, 5),
    confidence,
    evidence_quality,
    founder_decision,
    analyzed_at:      new Date().toISOString(),
  }
}

// ── POST /api/founder/analyze ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const gate = await assertFounder()
  if (!gate.ok) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const taskId = typeof body.task_id === 'string' ? body.task_id.trim() : ''
  if (!taskId) return NextResponse.json({ error: 'task_id required' }, { status: 400 })

  const snapshot = await loadSnapshot(taskId)
  if (!snapshot) return NextResponse.json({ error: 'task_not_found' }, { status: 404 })
  if (snapshot.status !== 'completed' && snapshot.status !== 'failed') {
    return NextResponse.json({ error: 'task_not_complete', status: snapshot.status }, { status: 409 })
  }

  const analysis = analyzeEvidence(snapshot)

  // Persist analysis inside the existing execution_memory record
  const augmented = { ...snapshot, analysis } as PersistedTask & { analysis: TaskAnalysis }
  await saveSnapshot(augmented)

  return NextResponse.json({ ok: true, task_id: taskId, analysis })
}
