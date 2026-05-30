import { NextResponse } from 'next/server'

// F.2C SDK probe retired. The WebAuthn MFA API's existence in the resolved SDK
// was proven by a successful typed compile (commit cef5aea). This stub is inert
// and leaks nothing; safe to delete in a follow-up via the GitHub UI.
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({ error: 'gone' }, { status: 410 })
}
