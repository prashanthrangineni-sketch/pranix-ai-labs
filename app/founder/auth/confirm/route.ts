import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase'

/**
 * Magic-link callback handler.
 *
 * Supabase redirects the user here after they click the magic link.
 * The URL carries a short-lived `code` query parameter that must be
 * exchanged for a session — server-side, so the resulting session
 * cookie is HTTP-only and readable by middleware + server components.
 *
 * The previous client-side page at /founder/auth/callback could not
 * do this because @supabase/supabase-js wrote sessions to localStorage,
 * which is invisible to the server. That callback is now dead code;
 * the login form points here instead.
 *
 * On success: redirect to ?next= if provided and safe, else /founder.
 * On failure: redirect to /founder/login?error=<reason>.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(
      `${origin}/founder/login?error=missing_code`
    )
  }

  const supabase = createServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${origin}/founder/login?error=${encodeURIComponent(error.message)}`
    )
  }

  // Only honor relative `next` paths under /founder to prevent open-redirect.
  const safeNext =
    nextParam && nextParam.startsWith('/founder') && !nextParam.startsWith('//')
      ? nextParam
      : '/founder'

  return NextResponse.redirect(`${origin}${safeNext}`)
}
