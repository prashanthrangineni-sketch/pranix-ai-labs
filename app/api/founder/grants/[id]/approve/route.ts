import { NextRequest, NextResponse } from 'next/server'
import { getControlPlane } from '../../../../lib/control-plane'

// POST /api/founder/grants/[id]/approve  — grants an MCP access request
// POST /api/founder/grants/[id]/revoke   — revokes a previously granted access

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getControlPlane()
    const { id } = await params
    const url = new URL(req.url)
    const action = url.pathname.endsWith('/revoke') ? 'revoke' : 'approve'

    const update =
      action === 'approve'
        ? { granted_at: new Date().toISOString(), revoked_at: null }
        : { revoked_at: new Date().toISOString() }

    const { error } = await db
      .from('mcp_access_grants')
      .update(update as any)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, action })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
