import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '../../../lib/control-plane'
import { founderStepUpGuard } from '@/lib/auth-aal'

// POST /api/founder/models
// Body: { provider_name: string, model_id: string, action: 'enable' | 'disable' }
// Writes model_registry.enabled for all rows matching provider_name + model_id.
// Enforced at runtime by P3 (loadDisabledModels). Founder-gated here.

const ALLOWED = ['enable', 'disable'] as const

export async function POST(req: NextRequest) {
  // 1. AuthN/AuthZ — logged-in founder on the allowlist.
  let email: string | null = null
  try {
    const auth = createServerClient()
    const { data } = await auth.auth.getUser()
    email = data.user?.email ?? null
    if (!email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const { data: founder } = await auth
      .from('dashboard_founders')
      .select('email')
      .eq('email', email)
      .maybeSingle()
    if (!founder) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  } catch {
    return NextResponse.json({ error: 'auth_check_failed' }, { status: 500 })
  }

  // 1b. Step-up — biometric (AAL2) required for control writes when enrolled.
  const stepUp = await founderStepUpGuard()
  if (stepUp) return stepUp

  // 2. Parse + validate.
  const body = await req.json().catch(() => ({}))
  const provider_name = body?.provider_name
  const model_id = body?.model_id
  const action = body?.action
  if (!provider_name || typeof provider_name !== 'string') {
    return NextResponse.json({ error: 'provider_name required' }, { status: 400 })
  }
  if (!model_id || typeof model_id !== 'string') {
    return NextResponse.json({ error: 'model_id required' }, { status: 400 })
  }
  if (!ALLOWED.includes(action)) {
    return NextResponse.json({ error: `action must be one of ${ALLOWED.join(', ')}` }, { status: 400 })
  }

  const enabled = action === 'enable'

  // 3. Write via service-role client + audit.
  try {
    const db = getControlPlane()
    const { data, error } = await db
      .from('model_registry')
      .update({ enabled })
      .eq('provider_name', provider_name)
      .eq('model_id', model_id)
      .select('provider_name, model_id, task_type, enabled')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) return NextResponse.json({ error: 'model_not_found' }, { status: 404 })

    try {
      await db.from('mcp_audit_logs').insert({
        client_name: email,
        tool_name: 'founder_ui:model_control',
        scope_used: 'admin',
        resource: `model_registry:${provider_name}/${model_id} enabled->${enabled} (${data.length} rows)`,
        status_code: 200,
        request_id: crypto.randomUUID(),
      } as never)
    } catch {}

    return NextResponse.json({ ok: true, provider_name, model_id, enabled, rows: data.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
