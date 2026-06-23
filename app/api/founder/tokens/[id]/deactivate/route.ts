import { NextRequest, NextResponse } from 'next/server'
import { getControlPlane } from '@/app/lib/control-plane'
import { requireWritableFounder } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireWritableFounder()
  if (gate instanceof NextResponse) return gate

  try {
    const { id } = await params
    const db = getControlPlane()

    // 1. Fetch client name for audit logging
    const { data: client, error: fetchError } = await db
      .from('mcp_clients')
      .select('client_name')
      .eq('id', id)
      .maybeSingle()

    if (fetchError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // 2. Set active = false in mcp_clients
    const { error: updateError } = await db
      .from('mcp_clients')
      .update({ active: false })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 3. Audit-log to mcp_audit_logs
    const { error: auditError } = await db
      .from('mcp_audit_logs')
      .insert({
        client_id: id,
        client_name: client.client_name,
        tool_name: 'deactivate_token',
        scope_used: 'write',
        resource: 'client_token',
        status_code: 200,
        latency_ms: 0,
        created_at: new Date().toISOString(),
        request_id: crypto.randomUUID()
      })

    if (auditError) {
      console.error('Failed to write audit log:', auditError)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
