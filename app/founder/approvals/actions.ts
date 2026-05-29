'use server'

import { revalidatePath } from 'next/cache'
import { approveGrant } from '@/lib/pranix-mcp'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '@/app/lib/control-plane'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─── Legacy single-approve (kept for back-compat) ────────────────

export type ApproveActionState = {
  ok: boolean
  message: string
  grantId?: string
}

export async function approveGrantAction(
  _prev: ApproveActionState | null,
  formData: FormData
): Promise<ApproveActionState> {
  const grantId = formData.get('grant_id')
  if (typeof grantId !== 'string' || !grantId) {
    return { ok: false, message: 'Missing grant_id' }
  }
  if (!UUID_RE.test(grantId)) {
    return { ok: false, message: 'Invalid grant_id format', grantId }
  }

  const result = await approveGrant({
    grant_id: grantId,
    reason: 'Approved via founder dashboard',
  })

  if (!result.ok) {
    return { ok: false, message: result.error, grantId }
  }

  revalidatePath('/founder/approvals')
  revalidatePath('/founder')
  return { ok: true, message: 'Grant approved', grantId }
}

// ─── Permission Center: five-option decision ─────────────────────

export type DecisionKind =
  | 'allow_once'
  | 'allow_session'
  | 'allow_permanent'
  | 'deny'
  | 'revoke'
  | 'expire'

export type DecisionState = {
  ok: boolean
  message: string
  grantId?: string
  action?: DecisionKind
}

const ALLOWED: DecisionKind[] = [
  'allow_once',
  'allow_session',
  'allow_permanent',
  'deny',
  'revoke',
  'expire',
]

/** Founder gate: must be signed in AND present in dashboard_founders. */
async function assertFounder():
  Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  try {
    const supa = createServerClient()
    const { data: { user } } = await supa.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!email) return { ok: false, message: 'Not signed in' }
    const { data } = await getControlPlane()
      .from('dashboard_founders')
      .select('email')
      .eq('email', email)
      .maybeSingle()
    if (!data) return { ok: false, message: 'Not authorized' }
    return { ok: true, email }
  } catch {
    return { ok: false, message: 'Authorization check failed' }
  }
}

const HOUR = 3600_000

function computeUpdate(action: DecisionKind, now: number, nowIso: string) {
  switch (action) {
    case 'allow_once':
      return { granted_at: nowIso, revoked_at: null, grant_type: 'single',
               expires_at: new Date(now + 15 * 60_000).toISOString() }
    case 'allow_session':
      return { granted_at: nowIso, revoked_at: null, grant_type: 'session',
               expires_at: new Date(now + 8 * HOUR).toISOString() }
    case 'allow_permanent':
      return { granted_at: nowIso, revoked_at: null, grant_type: 'permanent',
               expires_at: new Date(now + 100 * 365 * 24 * HOUR).toISOString() }
    case 'deny':
      return { revoked_at: nowIso }
    case 'revoke':
      return { revoked_at: nowIso }
  }
}

function successMessage(action: DecisionKind): string {
  switch (action) {
    case 'allow_once':      return 'Allowed once (15 min)'
    case 'allow_session':   return 'Allowed for this session (8 hrs)'
    case 'allow_permanent': return 'Allowed permanently'
    case 'deny':            return 'Denied'
    case 'revoke':          return 'Access revoked'
  }
}

export async function decideGrantAction(
  _prev: DecisionState | null,
  formData: FormData
): Promise<DecisionState> {
  const grantId = formData.get('grant_id')
  const action = formData.get('action') as DecisionKind | null

  if (typeof grantId !== 'string' || !UUID_RE.test(grantId)) {
    return { ok: false, message: 'Invalid request reference' }
  }
  if (!action || !ALLOWED.includes(action)) {
    return { ok: false, message: 'Unknown action', grantId }
  }

  const gate = await assertFounder()
  if (!gate.ok) return { ok: false, message: gate.message, grantId, action }

  const now = Date.now()
  const nowIso = new Date(now).toISOString()
  const cp = getControlPlane()

  const { data: rows, error } = await cp
    .from('mcp_access_grants')
    .update(computeUpdate(action, now, nowIso))
    .eq('id', grantId)
    .select('id, client_id, scope, resource_pattern')

  if (error) {
    return { ok: false, message: 'Could not apply the decision', grantId, action }
  }
  if (!rows || rows.length === 0) {
    return { ok: false, message: 'Request not found', grantId, action }
  }

  const g = rows[0] as { client_id: string | null; scope: string; resource_pattern: string }

  // Best-effort audit — never blocks the decision.
  try {
    await cp.from('mcp_audit_logs').insert({
      client_id: g.client_id ?? null,
      client_name: gate.email,
      tool_name: 'founder_permission_decision',
      scope_used: g.scope ?? action,
      resource: g.resource_pattern ?? null,
      status_code: 200,
      request_id: `decision:${action}`,
    })
  } catch { /* audit is best-effort */ }

  revalidatePath('/founder/approvals')
  revalidatePath('/founder')
  return { ok: true, message: successMessage(action), grantId, action }
}
