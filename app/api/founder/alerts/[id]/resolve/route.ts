import { NextRequest, NextResponse } from 'next/server'
import { getControlPlane } from '../../../../../lib/control-plane'
import { requireWritableFounder } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getControlPlane()
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const note = body?.note ?? 'Resolved by founder'

    const { error } = await db
      .from('founder_alerts')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        resolution_note: note,
      } as any)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
