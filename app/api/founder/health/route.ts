import { NextResponse } from 'next/server'

export const dynamic    = 'force-dynamic'
export const maxDuration = 10

const GATEWAY_URL = process.env.PRANIX_GATEWAY_URL ?? 'https://mcp.pranix.ai'

// ─── GET /api/founder/health ──────────────────────────────────────────────────
// Returns gateway liveness + round-trip latency.
// Consumed by MissionControl (gateway health banner) and execute/route.ts
// (execution verification). Deliberately separate from /api/founder/execute
// so health checks never trigger auth or task logic.
export async function GET() {
  const start = Date.now()
  let gateway_live    = false
  let gateway_latency_ms = -1

  try {
    const ctrl = new AbortController()
    const tid  = setTimeout(() => ctrl.abort(), 5_000)
    const res  = await fetch(`${GATEWAY_URL}/health`, {
      method: 'GET',
      signal: ctrl.signal,
      cache:  'no-store',
      headers: { Authorization: `Bearer ${process.env.PRANIX_MCP_TOKEN ?? ''}` },
    })
    clearTimeout(tid)
    gateway_live       = res.ok
    gateway_latency_ms = Date.now() - start
  } catch {
    gateway_latency_ms = Date.now() - start
  }

  return NextResponse.json({
    gateway_live,
    gateway_latency_ms,
    checked_at: new Date().toISOString(),
  })
}
