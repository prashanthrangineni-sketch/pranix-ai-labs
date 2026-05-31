import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireWritableFounder } from '@/lib/auth'
import { getControlPlane } from '../../../lib/control-plane'

// POST /api/founder/budget
// Body: { action: 'set' | 'clear', budget_usd?: number }
// Canonical budget key (P1): provider_registry[anthropic].config_json.max_daily_budget_usd
// 'set' with budget_usd=0 == pause paid usage. 'clear' reverts to the engine env default.
// Founder-gated here because /api/* is not covered by the founder middleware.

const BUDGET_PROVIDER = 'anthropic'

export async function POST(req: NextRequest) {
  // 0. Read-only guard — readonly founders (e.g. QA) may view but not mutate.
  const __gate = await requireWritableFounder()
  if (__gate instanceof NextResponse) return __gate

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

  // 2. Parse + validate.
  const body = await req.json().catch(() => ({}))
  const action = body?.action
  if (action !== 'set' && action !== 'clear') {
    return NextResponse.json({ error: "action must be 'set' or 'clear'" }, { status: 400 })
  }
  let budget = 0
  if (action === 'set') {
    budget = Number(body?.budget_usd)
    if (!Number.isFinite(budget) || budget < 0 || budget > 10000) {
      return NextResponse.json({ error: 'budget_usd must be 0-10000' }, { status: 400 })
    }
  }

  // 3. Read-modify-write config_json (preserve other keys) + audit.
  try {
    const db = getControlPlane()
    const { data: cur, error: readErr } = await db
      .from('provider_registry')
      .select('config_json')
      .eq('provider_name', BUDGET_PROVIDER)
      .maybeSingle()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
    if (!cur) return NextResponse.json({ error: 'budget_row_not_found' }, { status: 404 })

    const oldCfg = (cur.config_json ?? {}) as Record<string, unknown>
    const oldVal = oldCfg.max_daily_budget_usd ?? null
    const newCfg: Record<string, unknown> = { ...oldCfg }
    if (action === 'clear') delete newCfg.max_daily_budget_usd
    else newCfg.max_daily_budget_usd = budget

    const { data, error } = await db
      .from('provider_registry')
      .update({ config_json: newCfg })
      .eq('provider_name', BUDGET_PROVIDER)
      .select('provider_name, config_json')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    try {
      await db.from('mcp_audit_logs').insert({
        client_name: email,
        tool_name: 'founder_ui:budget_control',
        scope_used: 'admin',
        resource: `provider_registry:${BUDGET_PROVIDER}.config_json.max_daily_budget_usd ${oldVal ?? 'unset'}->${action === 'clear' ? 'unset' : budget}`,
        status_code: 200,
        request_id: crypto.randomUUID(),
      } as never)
    } catch {}

    return NextResponse.json({
      ok: true,
      action,
      old_value: oldVal,
      new_value: action === 'clear' ? null : budget,
      provider: data,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
