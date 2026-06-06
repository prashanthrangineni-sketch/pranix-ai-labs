import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '@/app/lib/control-plane'
import { getRoutingTable } from '@/lib/model-router'

export const dynamic = 'force-dynamic'

async function assertFounder(): Promise<boolean> {
  try {
    const supa = createServerClient()
    const { data: { user } } = await supa.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!email) return false
    const { data } = await getControlPlane()
      .from('dashboard_founders').select('email').eq('email', email).maybeSingle()
    return !!data
  } catch {
    return false
  }
}

export async function GET() {
  if (!await assertFounder()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const table = await getRoutingTable()
    return NextResponse.json({ routing_table: table, generated_at: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to build routing table' }, { status: 500 })
  }
}
