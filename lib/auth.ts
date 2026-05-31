import { NextResponse } from 'next/server'
import { createServerClient } from './supabase'

export type FounderRole = 'founder' | 'readonly'

export type FounderSession = { email: string; role: FounderRole }

/**
 * Check if the current request has a valid founder session.
 *
 * Returns the founder email + role if authenticated and present in the
 * dashboard_founders allowlist, null otherwise.
 *
 * Reads the Supabase session from HTTP-only cookies via @supabase/ssr.
 * The middleware (middleware.ts) is the primary auth gate for PAGE ACCESS —
 * this function is for in-component checks (e.g. conditionally showing
 * destructive controls) and for mutation routes (via requireWritableFounder).
 *
 * Role defaults to 'founder' when the column/value is absent, so existing
 * founders are unaffected before/after the role migration is applied.
 *
 * Server-side only — never call from a Client Component.
 */
export async function getFounderSession(): Promise<FounderSession | null> {
  try {
    const supabase = createServerClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user?.email) return null

    const { data: founder } = await supabase
      .from('dashboard_founders')
      .select('email, role')
      .eq('email', user.email)
      .maybeSingle()

    if (!founder) return null

    const role: FounderRole = founder.role === 'readonly' ? 'readonly' : 'founder'
    return { email: founder.email, role }
  } catch {
    return null
  }
}

/**
 * Mutation guard for founder API routes / server actions.
 *
 * Returns the FounderSession when the caller may write, or a ready-to-return
 * NextResponse (401 unauthenticated / 403 read-only) when they may not.
 *
 * Usage at the top of any mutating handler:
 *   const gate = await requireWritableFounder()
 *   if (gate instanceof NextResponse) return gate
 *   // ... gate.email / gate.role available here ...
 */
export async function requireWritableFounder(): Promise<FounderSession | NextResponse> {
  const session = await getFounderSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  if (session.role === 'readonly') {
    return NextResponse.json(
      { error: 'read_only_account', detail: 'This account has read-only access and cannot perform this action.' },
      { status: 403 },
    )
  }
  return session
}
