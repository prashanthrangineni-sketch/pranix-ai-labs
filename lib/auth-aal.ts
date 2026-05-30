import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// F.2C — server-side step-up enforcement for sensitive founder-control writes.
//
// Model: the persistent session (F.2B) authenticates the founder at AAL1
// (password / magic-link). Once a founder ENROLLS a WebAuthn biometric factor,
// `getAuthenticatorAssuranceLevel()` reports nextLevel='aal2'. Until they step
// up (biometric unlock) the session stays currentLevel='aal1'. For control
// WRITES we then require the step-up, returning 403 `step_up_required`.
//
// Properties:
//  - Additive: a founder with NO enrolled factor (nextLevel!=='aal2') is never
//    blocked — behaviour is identical to pre-F.2C.
//  - No weakening: when a factor IS enrolled, controls become STRONGER (aal2).
//  - Fail-open on read error: a transient MFA read failure never makes the
//    route MORE restrictive than today, so it can't lock the founder out.
//  - Password remains a first-class fallback for app access; biometric is the
//    factor required specifically for high-sensitivity control writes.
export async function founderStepUpGuard(): Promise<NextResponse | null> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error || !data) return null
    if (data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
      return NextResponse.json({ error: 'step_up_required' }, { status: 403 })
    }
  } catch {
    // fail-open — never more restrictive than pre-F.2C
  }
  return null
}
