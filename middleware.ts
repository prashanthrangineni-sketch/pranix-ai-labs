import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://mvdjyjccvioxircxuzgz.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Routes within /founder that must remain reachable without a session.
 * Sign-in flow lives here; everything else under /founder is gated.
 */
const PUBLIC_FOUNDER_PATHS = ['/founder/login', '/founder/auth/callback']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Refresh the auth cookie on every request so server components see a
  // valid session. This is the Supabase-recommended pattern: middleware
  // is the only place that can write cookies for the next response.
  let response = NextResponse.next({ request })

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
  })

  // IMPORTANT: do not put any logic between createServerClient and
  // getUser. Calling getUser triggers the cookie refresh; anything that
  // depends on the user must come after.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Only gate /founder routes — public site and /status stay open.
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

  // Verify the authenticated email is on the founder allowlist.
  // RLS allows reading dashboard_founders with the anon key — the table
  // is intentionally readable so this check is cheap.
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
  // Preserve the original destination so we can bounce back post-login
  // in a future enhancement. Right now /founder/auth/callback always
  // routes to /founder, but the query param is harmless and useful.
  url.searchParams.set('next', attemptedPath)
  return NextResponse.redirect(url)
}

export const config = {
  /**
   * Run on every route except static assets and Next internals.
   * Matching narrowly avoids a Supabase call on /_next/* and images.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
