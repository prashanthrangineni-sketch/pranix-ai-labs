import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { AUTH_COOKIE_OPTIONS } from '@/lib/auth-cookie-options'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://mvdjyjccvioxircxuzgz.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const PUBLIC_FOUNDER_PATHS = [
  '/founder/login',
  '/founder/auth/callback',
  '/founder/auth/confirm',
  '/founder/auth/reset',
  '/founder/break-glass',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Supabase delivers auth links (recovery / magic-link) to the configured
  // Site URL — which is the root "/" — appending ?code=... (PKCE) or ?error=...
  // Nothing at "/" exchanges the code, so the founder lands on the homepage and
  // auth silently fails. Forward the code to the reset page (which runs
  // exchangeCodeForSession + shows the set-password form) and errors to login.
  if (pathname === '/') {
    const sp = request.nextUrl.searchParams
    const authCode = sp.get('code')
    const tokenHash = sp.get('token_hash')
    const type = sp.get('type')
    const authErr =
      sp.get('error_description') || sp.get('error_code') || sp.get('error')

    // Stateless OTP / recovery flow (no PKCE verifier needed). Forward to the
    // confirm route, which calls verifyOtp() server-side — works on any device,
    // including when the email opens in a different browser than it was requested.
    if (tokenHash && type) {
      const url = request.nextUrl.clone()
      url.pathname = '/founder/auth/confirm'
      if (!sp.get('next')) {
        url.searchParams.set('next', type === 'recovery' ? '/founder/account' : '/founder')
      }
      return NextResponse.redirect(url)
    }
    // PKCE code flow (same-browser): the reset page exchanges it client-side.
    if (authCode) {
      const url = request.nextUrl.clone()
      url.pathname = '/founder/auth/reset'
      return NextResponse.redirect(url)
    }
    if (authErr) {
      const url = request.nextUrl.clone()
      url.pathname = '/founder/login'
      url.search = ''
      url.searchParams.set('error', authErr)
      return NextResponse.redirect(url)
    }
  }

  let response = NextResponse.next({ request })

  const isFounderRouteEarly = pathname.startsWith('/founder')

  // ── Survive a missing anon key ────────────────────────────────────
  //
  // SUPABASE_ANON_KEY falls back to '' when NEXT_PUBLIC_SUPABASE_ANON_KEY is
  // unset. createServerClient() then throws "Your project's URL and Key are
  // required to create a Supabase client!" — an UNCAUGHT throw inside
  // middleware, which Next.js turns into a bare HTTP 500.
  //
  // Look at the matcher at the bottom of this file: it excludes static assets
  // and nothing else. This middleware runs on EVERY route. So one unset
  // environment variable does not degrade the dashboard — it returns 500 for
  // the entire site, the public marketing pages included. No login screen, no
  // error page, no clue what happened.
  //
  // Found 2026-08-25 by running the app locally without the variable set.
  //
  // Degrade instead:
  //   * public routes carry on completely unaffected — a marketing site does
  //     not need an auth client to render;
  //   * founder routes go to the login screen with a named reason, so whoever
  //     sees it knows it is a configuration problem rather than their password.
  //
  // This is not a substitute for the variable being set. It is the difference
  // between one broken thing and everything being broken.
  if (!SUPABASE_ANON_KEY) {
    console.error(
      '[middleware] NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Founder auth cannot run. ' +
      'Public routes are being served normally; founder routes redirect to login.',
    )
    if (!isFounderRouteEarly) return response
    const url = request.nextUrl.clone()
    url.pathname = '/founder/login'
    url.search = ''
    url.searchParams.set('error', 'auth_unavailable')
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
    cookieOptions: AUTH_COOKIE_OPTIONS,
  })

  // getUser() reaches out over the network. A Supabase blip, a DNS failure or a
  // timeout throws here, and — same as the missing-key case above — an uncaught
  // throw in middleware is a 500 for every route on the site. Fail closed for
  // the dashboard, open for everything else.
  let user: { email?: string | null } | null = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch (err) {
    console.error('[middleware] auth.getUser() failed:', err)
    if (!pathname.startsWith('/founder')) return response
    return redirectToLogin(request, pathname)
  }

  const isFounderRoute = pathname.startsWith('/founder')
  if (!isFounderRoute) {
    return response
  }

  const isPublicFounderPath = PUBLIC_FOUNDER_PATHS.some((p) =>
    pathname === p || pathname.startsWith(p + '/')
  )
  if (isPublicFounderPath) {
    return response
  }

  if (!user?.email) {
    return redirectToLogin(request, pathname)
  }

  const { data: founder } = await supabase
    .from('dashboard_founders')
    .select('email')
    .eq('email', user.email)
    .maybeSingle()

  if (!founder) {
    return redirectToLogin(request, pathname)
  }

  return response
}

function redirectToLogin(request: NextRequest, attemptedPath: string) {
  const url = request.nextUrl.clone()
  url.pathname = '/founder/login'
  url.searchParams.set('next', attemptedPath)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|logo-nav.png|icon-192.png|icon-512.png|manifest.webmanifest|sitemap.xml|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
