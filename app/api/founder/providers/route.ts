import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '../../../lib/control-plane'
import { founderStepUpGuard } from '@/lib/auth-aal'

// POST /api/founder/providers
// Body: { provider_name: string, action: 'enable'|'disable'|'set_priority', priority?: number }
// Founder-gated: /api/* is NOT covered by the founder middleware, so we verify
// the session + allowlist here before any write.

const ALLOWED_ACTIONS = ['enable', 'disable', 'set_priority'] as const

export async function POST(req: NextRequest) {
  // 1. AuthN/AuthZ — must be a logged-in founder on the allowlist.
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
  const action = body?.action
  if (!provider_name || typeof provider_name !== 'string') {
    return NextResponse.json({ error: 'provider_name required' }, { status: 400 })
  }
  if (!ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json({ error: `action must be one of ${ALLOWED_ACTIONS.join(', ')}` }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (action === 'enable') update.enabled = true
  if (action === 'disable') update.enabled = false
  if (action === 'set_priority') {
    const p = Number(body?.priority)
    if (!Number.isFinite(p) || p < 0 || p > 999) {
      return NextResponse.json({ error: 'priority must be 0-999' }, { status: 400 })
    }
    update.priority = p
  }

  // 3. Write via service-role client (RLS-bypassing) + audit row.
  try {
    const db = getControlPlane()
    const { data, error } = await db
      .from('provider_registry')
      .update(update)
      .eq('provider_name', provider_name)
      .select('provider_name, enabled, tier, priority')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'provider_not_found' }, { status: 404 })

    // Best-effort audit (never blocks the response).
    try {
      await db.from('mcp_audit_logs').insert({
        client_name: email,
        tool_name: 'founder_ui:provider_control',
        scope_used: 'admin',
        resource: `provider_registry:${provider_name}`,
        status_code: 200,
        request_id: crypto.randomUUID(),
      } as never)
    } catch {}

    return NextResponse.json({ ok: true, provider: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
