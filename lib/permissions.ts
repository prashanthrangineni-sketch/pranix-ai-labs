import { getControlPlane } from '@/app/lib/control-plane'

// ─── Types ───────────────────────────────────────────────────────

export type PermissionRequest = {
  id: string
  client_id: string | null
  scope: string
  resource_pattern: string
  reason: string | null
  requested_task: string | null
  grant_type: string | null
  risk_level: string | null
  requested_at: string | null
  granted_at: string | null
  expires_at: string
  revoked_at: string | null
  session_id: string | null
  // joined from mcp_clients
  requestor_name: string
  requestor_vendor: string | null
  is_founder: boolean
}

export type PermissionInbox = {
  pending: PermissionRequest[]
  active: PermissionRequest[]
  history: PermissionRequest[]
}

const GRANT_COLS =
  'id, client_id, scope, resource_pattern, reason, requested_task, grant_type, risk_level, requested_at, granted_at, expires_at, revoked_at, session_id'

/**
 * Read the permission inbox straight from the control plane (service role,
 * so it is not affected by RLS) and join requestor identity from mcp_clients.
 *
 * Buckets:
 *   pending  — never decided, not revoked, not yet expired (granted_at IS NULL)
 *   active   — decided/granted, not revoked, not yet expired
 *   history  — everything else (denied, revoked, or expired) — read-only
 */
export async function getPermissionInbox(limit = 150): Promise<PermissionInbox> {
  const db = getControlPlane()

  const { data: grants, error } = await db
    .from('mcp_access_grants')
    .select(GRANT_COLS)
    .order('requested_at', { ascending: false })
    .limit(limit)

  if (error || !grants) {
    return { pending: [], active: [], history: [] }
  }

  // Resolve requestor display names in one round-trip.
  const clientIds = Array.from(
    new Set(grants.map((g: any) => g.client_id).filter(Boolean))
  ) as string[]

  const nameById = new Map<string, { name: string; vendor: string | null; founder: boolean }>()
  if (clientIds.length > 0) {
    const { data: clients } = await db
      .from('mcp_clients')
      .select('id, display_name, client_name, vendor_hint, is_founder')
      .in('id', clientIds)
    for (const c of clients ?? []) {
      nameById.set(c.id, {
        name: c.display_name || c.client_name || 'Unknown service',
        vendor: c.vendor_hint ?? null,
        founder: !!c.is_founder,
      })
    }
  }

  const now = Date.now()
  const pending: PermissionRequest[] = []
  const active: PermissionRequest[] = []
  const history: PermissionRequest[] = []

  for (const g of grants as any[]) {
    const who = (g.client_id && nameById.get(g.client_id)) || {
      name: 'Unknown service',
      vendor: null,
      founder: false,
    }
    const row: PermissionRequest = {
      id: g.id,
      client_id: g.client_id ?? null,
      scope: g.scope,
      resource_pattern: g.resource_pattern,
      reason: g.reason ?? null,
      requested_task: g.requested_task ?? null,
      grant_type: g.grant_type ?? null,
      risk_level: g.risk_level ?? null,
      requested_at: g.requested_at ?? null,
      granted_at: g.granted_at ?? null,
      expires_at: g.expires_at,
      revoked_at: g.revoked_at ?? null,
      session_id: g.session_id ?? null,
      requestor_name: who.name,
      requestor_vendor: who.vendor,
      is_founder: who.founder,
    }

    const expMs = new Date(g.expires_at).getTime()
    if (g.revoked_at) {
      history.push(row)
    } else if (!g.granted_at) {
      if (expMs > now) pending.push(row)
      else history.push(row)
    } else {
      if (expMs > now) active.push(row)
      else history.push(row)
    }
  }

  return { pending, active, history }
}
