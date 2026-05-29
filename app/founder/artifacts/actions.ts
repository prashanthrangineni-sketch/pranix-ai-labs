'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '@/app/lib/control-plane'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ActionResult = { ok: boolean; message: string }

const DIRECT: string[] = ['mark_canonical', 'mark_reviewed', 'mark_superseded']
const ROUTED: string[] = ['request_archive', 'request_purge']

/** Founder gate: signed in AND present in dashboard_founders. */
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

async function audit(email: string, tool: string, resource: string) {
  try {
    await getControlPlane().from('mcp_audit_logs').insert({
      client_name: email,
      tool_name: tool,
      scope_used: 'admin',
      resource,
      status_code: 200,
      request_id: tool,
    })
  } catch { /* audit is best-effort */ }
}

async function founderClientId(): Promise<string | null> {
  const { data } = await getControlPlane()
    .from('mcp_clients').select('id').eq('is_founder', true).limit(1).maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}

/**
 * Artifact lifecycle + governance action.
 * Non-destructive transitions apply directly (audited). Destructive ones
 * (archive/purge) NEVER execute here — they file a pending grant in the
 * Permission Center for founder approval.
 */
export async function artifactAction(id: string, action: string): Promise<ActionResult> {
  if (!UUID_RE.test(id)) return { ok: false, message: 'Invalid artifact reference' }
  if (!DIRECT.includes(action) && !ROUTED.includes(action)) {
    return { ok: false, message: 'Unknown action' }
  }
  const gate = await assertFounder()
  if (!gate.ok) return { ok: false, message: gate.message }

  const cp = getControlPlane()
  const nowIso = new Date().toISOString()

  if (DIRECT.includes(action)) {
    const patch: Record<string, unknown> =
      action === 'mark_canonical'
        ? { status: 'canonical', founder_reviewed: true, updated_at: nowIso }
        : action === 'mark_superseded'
          ? { status: 'superseded', updated_at: nowIso }
          : { founder_reviewed: true, updated_at: nowIso }

    const { data, error } = await cp
      .from('artifact_registry').update(patch).eq('id', id).select('id')
    if (error) return { ok: false, message: 'Could not update artifact' }
    if (!data || data.length === 0) return { ok: false, message: 'Artifact not found' }

    await audit(gate.email, `artifact_${action}`, `artifact:${id}`)
    revalidatePath('/founder/artifacts')
    const label =
      action === 'mark_canonical' ? 'Marked canonical'
        : action === 'mark_superseded' ? 'Marked superseded' : 'Marked reviewed'
    return { ok: true, message: label }
  }

  // ── ROUTED: destructive → Permission Center pending grant (never executes here) ──
  const { data: art } = await cp
    .from('artifact_registry').select('id, title, source_table').eq('id', id).maybeSingle()
  if (!art) return { ok: false, message: 'Artifact not found' }
  const a = art as { title: string; source_table: string | null }

  const destructive = action === 'request_purge'
  const { error } = await cp.from('mcp_access_grants').insert({
    client_id: await founderClientId(),
    scope: 'admin',
    resource_pattern: `artifact:${destructive ? 'purge' : 'archive'}:${a.source_table ?? id}`,
    reason: `${destructive ? 'PURGE (permanent delete)' : 'Archive'} artifact "${a.title}"`,
    requested_task: `${destructive ? 'Drop source / delete rows' : 'Archive'} for ${a.source_table ?? id}`,
    impact: destructive
      ? 'Permanently deletes the underlying data. Not recoverable once executed.'
      : 'Hides the artifact from active views. Reversible.',
    alternatives: destructive ? 'Archive instead of purge to retain history.' : 'Leave active.',
    risk_level: destructive ? 'high' : 'medium',
    grant_type: 'single',
    granted_at: null,
    revoked_at: null,
    requested_at: nowIso,
    expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
    session_id: `artifact:${id}`,
  })
  if (error) return { ok: false, message: 'Could not file the request' }

  await audit(gate.email, `artifact_${action}`, `artifact:${id}`)
  revalidatePath('/founder/artifacts')
  revalidatePath('/founder/approvals')
  return {
    ok: true,
    message: destructive
      ? 'Purge request sent to Permission Center for approval'
      : 'Archive request sent to Permission Center',
  }
}

/** Batch request to purge all archived build-scratch tables — routes to Permission Center. */
export async function requestScratchPurge(): Promise<ActionResult> {
  const gate = await assertFounder()
  if (!gate.ok) return { ok: false, message: gate.message }
  const cp = getControlPlane()
  const nowIso = new Date().toISOString()

  const { error } = await cp.from('mcp_access_grants').insert({
    client_id: await founderClientId(),
    scope: 'admin',
    resource_pattern: 'artifact:purge:archived-build-scratch',
    reason: 'PURGE all archived build-scratch tables (legacy spawn/phase drafts)',
    requested_task: 'DROP the archived purgeable scratch tables cataloged in artifact_registry',
    impact: 'Permanently drops the legacy scratch tables and their rows. Not recoverable once executed.',
    alternatives: 'Keep them archived; they consume little space.',
    risk_level: 'high',
    grant_type: 'single',
    granted_at: null,
    revoked_at: null,
    requested_at: nowIso,
    expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
    session_id: 'artifact:purge:scratch',
  })
  if (error) return { ok: false, message: 'Could not file the purge request' }

  await audit(gate.email, 'artifact_request_scratch_purge', 'artifact:archived-build-scratch')
  revalidatePath('/founder/artifacts')
  revalidatePath('/founder/approvals')
  return { ok: true, message: 'Purge request for archived scratch sent to Permission Center' }
}
