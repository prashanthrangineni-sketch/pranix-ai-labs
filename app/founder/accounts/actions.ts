'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '@/app/lib/control-plane'

export type AccountActionKind = 'reauthorize' | 'rotate' | 'disconnect' | 'connect'

export type AccountActionState = {
  ok: boolean
  message: string
  integrationId?: string
  action?: AccountActionKind
}

const ALLOWED: AccountActionKind[] = ['reauthorize', 'rotate', 'disconnect', 'connect']

async function assertFounder():
  Promise<{ ok: true; email: string } | { ok: false }> {
  try {
    const supa = createServerClient()
    const { data: { user } } = await supa.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!email) return { ok: false }
    const { data } = await getControlPlane()
      .from('dashboard_founders').select('email').eq('email', email).maybeSingle()
    if (!data) return { ok: false }
    return { ok: true, email }
  } catch {
    return { ok: false }
  }
}

/**
 * Account actions never execute directly. They create a pending request in the
 * Permission Center (mcp_access_grants, granted_at = NULL) for the founder to
 * approve. No bypass.
 */
export async function requestAccountAction(
  _prev: AccountActionState | null,
  formData: FormData
): Promise<AccountActionState> {
  const integrationId = String(formData.get('integration_id') ?? '')
  const integrationName = String(formData.get('integration_name') ?? integrationId)
  const action = formData.get('action') as AccountActionKind | null

  if (!integrationId) return { ok: false, message: 'Missing integration' }
  if (!action || !ALLOWED.includes(action)) {
    return { ok: false, message: 'Unknown action', integrationId }
  }

  const gate = await assertFounder()
  if (!gate.ok) return { ok: false, message: 'Not authorized', integrationId, action }

  const cp = getControlPlane()
  const { data: fc } = await cp
    .from('mcp_clients').select('id').eq('is_founder', true).limit(1).maybeSingle()

  const scope = action === 'disconnect' ? 'admin' : 'write'
  const { error } = await cp.from('mcp_access_grants').insert({
    client_id: fc?.id ?? null,
    scope,
    resource_pattern: `account:${integrationId}:${action}`,
    reason: `Account action requested via Account Hub by ${gate.email}`,
    requested_task: `${action} ${integrationName}`,
    grant_type: 'single',
    risk_level: action === 'disconnect' ? 'high' : 'medium',
    granted_at: null,
    expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
    revoked_at: null,
  })

  if (error) {
    return { ok: false, message: 'Could not send for approval', integrationId, action }
  }

  revalidatePath('/founder/approvals')
  revalidatePath('/founder/accounts')

  const verb =
    action === 'reauthorize' ? 'Reauthorize'
    : action === 'rotate' ? 'Rotate key for'
    : action === 'disconnect' ? 'Disconnect'
    : 'Connect'
  return {
    ok: true,
    message: `Sent for approval: ${verb} ${integrationName}`,
    integrationId,
    action,
  }
}
