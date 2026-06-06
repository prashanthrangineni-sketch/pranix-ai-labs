import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getControlPlane } from '@/app/lib/control-plane'
import { readTimeline, readTask } from '@/lib/tasks'

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

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const email = await getFounderEmail()
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const taskId = params.id
  try {
    const [task, events] = await Promise.all([
      readTask(taskId),
      readTimeline(taskId),
    ])
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    return NextResponse.json({ task, events })
  } catch {
    return NextResponse.json({ error: 'Failed to read timeline' }, { status: 500 })
  }
}
