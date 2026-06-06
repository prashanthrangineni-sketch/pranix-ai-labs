import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '@/app/lib/control-plane'
import { listRecentTasks } from '@/lib/tasks'

export const dynamic = 'force-dynamic'

async function getFounderEmail(): Promise<string | null> {
  try {
    const supa = createServerClient()
    const { data: { user } } = await supa.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!email) return null
    const { data } = await getControlPlane()
      .from('dashboard_founders').select('email').eq('email', email).maybeSingle()
    return data ? email : null
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const email = await getFounderEmail()
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '30'), 100)

  try {
    const tasks = await listRecentTasks(email, limit)
    return NextResponse.json({ tasks, count: tasks.length })
  } catch {
    return NextResponse.json({ error: 'Failed to read tasks' }, { status: 500 })
  }
}
