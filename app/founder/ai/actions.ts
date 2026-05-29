'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '@/app/lib/control-plane'
import { validateProvider } from '@/lib/ai-framework'

export type ActivationState = {
  ok: boolean
  message: string
  providerKey?: string
  missing?: string[]
}

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
 * Request activation of an AI provider.
 *
 * Hard rule: a provider can NEVER become active until validation passes. This
 * is re-checked on the server (the client is never trusted). On pass, we do not
 * flip it live directly — we create a pending request in the Permission Center
 * for the founder to approve. No bypass.
 */
export async function requestProviderActivation(
  _prev: ActivationState | null,
  formData: FormData
): Promise<ActivationState> {
  const providerKey = String(formData.get('provider_key') ?? '')
  const displayName = String(formData.get('display_name') ?? providerKey)
  if (!providerKey) return { ok: false, message: 'Missing provider' }

  const gate = await assertFounder()
  if (!gate.ok) return { ok: false, message: 'Not authorized', providerKey }

  const v = await validateProvider(providerKey)
  if (!v.ok) {
    return {
      ok: false,
      providerKey,
      missing: v.missing,
      message: `Cannot activate yet — ${v.missing.length} requirement(s) missing.`,
    }
  }

  const cp = getControlPlane()
  const { data: fc } = await cp
    .from('mcp_clients').select('id').eq('is_founder', true).limit(1).maybeSingle()

  const { error } = await cp.from('mcp_access_grants').insert({
    client_id: fc?.id ?? null,
    scope: 'admin',
    resource_pattern: `ai-provider:${providerKey}:activate`,
    reason: `Activate AI provider ${displayName} — requested via AI Integration Framework by ${gate.email}`,
    requested_task: `Activate provider ${displayName} (${providerKey})`,
    grant_type: 'single',
    risk_level: 'high',
    granted_at: null,
    expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
    revoked_at: null,
  })
  if (error) {
    return { ok: false, message: 'Could not send for approval', providerKey }
  }

  revalidatePath('/founder/approvals')
  revalidatePath('/founder/ai')
  return {
    ok: true,
    providerKey,
    message: `Validation passed. Sent to your Permission Center to approve activation of ${displayName}.`,
  }
}
