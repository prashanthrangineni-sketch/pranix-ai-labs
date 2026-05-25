import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://mvdjyjccvioxircxuzgz.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const PUBLIC_FOUNDER_PATHS = [
  '/founder/login',
  '/founder/auth/callback',
  '/founder/auth/confirm',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
