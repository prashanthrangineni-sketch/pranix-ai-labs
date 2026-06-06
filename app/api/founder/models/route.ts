import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireWritableFounder } from '@/lib/auth'
import { getControlPlane } from '../../../lib/control-plane'

export const dynamic = 'force-dynamic'

// ── GET /api/founder/models ─────────────────────────────────────────────────
// Returns all models from model_registry enriched with provider_health status
// and ai_onboarding key status. Used exclusively by the ModelSelector UI.
// No write operations.

export async function GET(_req: NextRequest) {
  // Auth — founder only
  try {
    const auth = createServerClient()
    const { data } = await auth.auth.getUser()
    const email = data.user?.email ?? null
    if (!email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const { data: founder } = await auth
      .from('dashboard_founders').select('email').eq('email', email).maybeSingle()
    if (!founder) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  } catch {
    return NextResponse.json({ error: 'auth_check_failed' }, { status: 500 })
  }

  try {
    const db = getControlPlane()

    const [modRes, healthRes, onbRes] = await Promise.all([
      db.from('model_registry')
        .select('provider_name, model_id, task_type, is_free, enabled, priority')
        .order('provider_name').order('priority'),
      db.from('provider_health')
        .select('provider, status'),
      db.from('ai_onboarding')
        .select('provider_key, status'),
    ])

    const healthMap = new Map<string, string>(
      (healthRes.data ?? []).map((r) => [r.provider.toLowerCase(), r.status ?? 'unknown'])
    )
    const onbMap = new Map<string, string>(
      (onbRes.data ?? []).map((r) => [r.provider_key.toLowerCase(), r.status ?? 'unknown'])
    )

    // ── Auto option — always first, always available ──
    const AUTO = {
      model_id: 'auto',
      provider: 'Pranix',
      display_name: 'Auto',
      task_types: ['all'],
      is_free: true,
      enabled: true,
      status: 'available' as const,
      status_reason: null as string | null,
      engine_model_id: 'auto',
    }

    type ModelOption = typeof AUTO

    const rows = (modRes.data ?? []) as {
      provider_name: string
      model_id: string
      task_type: string | null
      is_free: boolean
      enabled: boolean
      priority: number | null
    }[]

    // De-duplicate: one entry per (provider_name, model_id)
    const seen = new Set<string>()
    const models: ModelOption[] = [AUTO]

    for (const r of rows) {
      const key = `${r.provider_name}|${r.model_id}`
      if (seen.has(key)) continue
      seen.add(key)

      const provLower = r.provider_name.toLowerCase()
      const healthStatus = healthMap.get(provLower) ?? 'unknown'
      const onbStatus = onbMap.get(provLower) ?? 'unknown'

      // Derive UI status
      let status: 'available' | 'offline' | 'missing_key' | 'founder_only' = 'available'
      let status_reason: string | null = null

      if (!r.enabled) {
        status = 'offline'
        status_reason = 'Disabled by founder'
      } else if (onbStatus === 'pending' || onbStatus === 'missing_key') {
        status = 'missing_key'
        status_reason = 'Missing API Key'
      } else if (healthStatus === 'degraded' || healthStatus === 'failed') {
        status = 'offline'
        status_reason = `Provider ${healthStatus}`
      } else if (r.is_free === false && onbStatus !== 'active') {
        status = 'founder_only'
        status_reason = 'Founder Select Only'
      }

      // Human-readable display name: provider + short model label
      const shortModel = r.model_id
        .split('/').pop()!         // strip org prefix e.g. "anthropic/claude-3-5-sonnet" → "claude-3-5-sonnet"
        .replace(/-\d{8}$/, '')    // strip date suffixes
        .replace(/-latest$/, '')
      const display = `${r.provider_name} · ${shortModel}`

      models.push({
        model_id: key,             // unique UI key
        provider: r.provider_name,
        display_name: display,
        task_types: r.task_type ? [r.task_type] : ['general'],
        is_free: r.is_free,
        enabled: r.enabled,
        status,
        status_reason,
        engine_model_id: r.model_id,  // raw value forwarded to engine
      })
    }

    return NextResponse.json({ models })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── POST /api/founder/models ─────────────────────────────────────────────────
// Body: { provider_name: string, model_id: string, action: 'enable' | 'disable' }
// Writes model_registry.enabled. Founder-gated.

const ALLOWED = ['enable', 'disable'] as const

export async function POST(req: NextRequest) {
  const __gate = await requireWritableFounder()
  if (__gate instanceof NextResponse) return __gate

  let email: string | null = null
  try {
    const auth = createServerClient()
    const { data } = await auth.auth.getUser()
    email = data.user?.email ?? null
    if (!email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const { data: founder } = await auth
      .from('dashboard_founders').select('email').eq('email', email).maybeSingle()
    if (!founder) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  } catch {
    return NextResponse.json({ error: 'auth_check_failed' }, { status: 500 })
  }

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
