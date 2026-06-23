import { NextResponse, NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  // Check auth using temp header key
  const authHeader = request.headers.get('x-temp-auth')
  if (authHeader !== 'temp_key_rotate_7749fbc2e') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const envKeys = Object.keys(process.env).sort()
  const envSummary: Record<string, string> = {}
  for (const k of envKeys) {
    const val = process.env[k] || ''
    if (val) {
      envSummary[k] = `defined (length: ${val.length}, prefix: ${val.slice(0, 5)})`
    } else {
      envSummary[k] = 'empty'
    }
  }

  return NextResponse.json({
    env_keys: envKeys,
    env_summary: envSummary
  })
}
