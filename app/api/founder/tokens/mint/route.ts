import { NextRequest, NextResponse } from 'next/server'
import { getControlPlane } from '@/app/lib/control-plane'
import { requireWritableFounder } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const gate = await requireWritableFounder()
  if (gate instanceof NextResponse) return gate

  try {
    const body = await req.json()
    const { client_name, display_name, notes, rate_limit_per_hour, default_scopes, vendor_hint } = body

    if (!client_name) {
      return NextResponse.json({ error: 'client_name is required' }, { status: 400 })
    }

    const selectedScopes = Array.isArray(default_scopes) ? default_scopes : ['read']
    const db = getControlPlane()

    // 1. Generate token
    const token = 'pmcp_' + crypto.randomBytes(24).toString('hex') // pmcp_ + 48 hex = 53 chars
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const tokenPrefix = token.substring(0, 9) // first 9 characters of the token

    const clientId = crypto.randomUUID()

    // 2. Insert into mcp_clients
    const { error: clientError } = await db
      .from('mcp_clients')
      .insert({
        id: clientId,
        client_name,
        display_name: display_name || client_name,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        default_scopes: selectedScopes,
        active: true,
        rate_limit_per_hour: rate_limit_per_hour || 900,
        is_founder: false, // Routine minted tokens must NOT be founder-privileged
        vendor_hint: vendor_hint || null,
        notes: notes || null,
        registered_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })

    if (clientError) {
      return NextResponse.json({ error: clientError.message }, { status: 500 })
    }

    // 3. Assign permissions via mcp_access_grants from mcp_permission_templates filtered by selected scopes
    const { data: templates, error: templatesError } = await db
      .from('mcp_permission_templates')
      .select('scope, resource_pattern, notes')
      .eq('active', true)
      .in('scope', selectedScopes)

    if (templatesError) {
      console.error('Failed to fetch templates:', templatesError)
    } else if (templates && templates.length > 0) {
      const grantsToInsert = templates.map((tmpl) => ({
        id: crypto.randomUUID(),
        client_id: clientId,
        scope: tmpl.scope,
        resource_pattern: tmpl.resource_pattern,
        reason: tmpl.notes || 'Default template permission',
        granted_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        requested_at: new Date().toISOString(),
      }))

      const { error: grantsError } = await db
        .from('mcp_access_grants')
        .insert(grantsToInsert)

      if (grantsError) {
        console.error('Failed to insert default grants:', grantsError)
      }
    }

    // 4. Audit-log to mcp_audit_logs: record ACTING founder's email as client_name (actor)
    const { error: auditError } = await db
      .from('mcp_audit_logs')
      .insert({
        client_id: clientId,
        client_name: gate.email,
        tool_name: 'mint_token',
        scope_used: 'write',
        resource: `client_token:${client_name}`,
        status_code: 200,
        latency_ms: 0,
        created_at: new Date().toISOString(),
        request_id: crypto.randomUUID()
      })

    if (auditError) {
      console.error('Failed to write audit log:', auditError)
    }

    // Return the plaintext token ONCE
    return NextResponse.json({
      ok: true,
      clientId,
      client_name,
      token, // Plaintext token returned only now
      tokenPrefix
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
