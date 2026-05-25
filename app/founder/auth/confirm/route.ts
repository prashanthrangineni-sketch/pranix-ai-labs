import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase'

/**
 * Magic-link callback handler.
 *
 * Supports two Supabase auth flows:
 * 1. OTP/magic-link: URL has token_hash + type params
 * 2. PKCE: URL has code param
 *
 * The login form uses signInWithOtp() which sends flow #1.
 * We handle both for robustness.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'magiclink' | 'email' | null
  const nextParam = searchParams.get('next')

  const supabase = createServerClient()

  // Flow 1: OTP/magic-link verification (token_hash + type)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type === 'email' ? 'email' : 'magiclink',
    })
    if (error) {
      return NextResponse.redirect(
        `${origin}/founder/login?error=${encodeURIComponent(error.message)}`
      )
    }
    const safeNext =
      nextParam && nextParam.startsWith('/founder') && !nextParam.startsWith('//')
        ? nextParam
        : '/founder'
    return NextResponse.redirect(`${origin}${safeNext}`)
  }

  // Flow 2: PKCE code exchange (fallback)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(
        `${origin}/founder/login?error=${encodeURIComponent(error.message)}`
      )
    }
    const safeNext =
      nextParam && nextParam.startsWith('/founder') && !nextParam.startsWith('//')
        ? nextParam
        : '/founder'
    return NextResponse.redirect(`${origin}${safeNext}`)
  }

  // Neither flow — missing params
  return NextResponse.redirect(
    `${origin}/founder/login?error=missing_auth_params`
  )
}
