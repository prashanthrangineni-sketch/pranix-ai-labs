import { NextRequest, NextResponse } from 'next/server'
import { requireWritableFounder } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const __gate = await requireWritableFounder()
  if (__gate instanceof NextResponse) return __gate

  try {
    const body = await req.json()
    const engineUrl = process.env.PRANIX_AGENT_ENGINE_URL ?? 'https://pranix-agent-engine.vercel.app'
    const workerSecret = process.env.WORKER_SECRET

    const res = await fetch(`${engineUrl}/api/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${workerSecret}`
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: errText }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
