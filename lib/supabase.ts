import {
  createServerClient as createSsrServerClient,
  createBrowserClient as createSsrBrowserClient,
  type CookieOptions,
} from '@supabase/ssr'
import { cookies } from 'next/headers'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://mvdjyjccvioxircxuzgz.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Server-side Supabase client for use in Server Components, Route Handlers,
 * and Server Actions.
 *
 * Reads auth from HTTP-only cookies via @supabase/ssr so that
 * `supabase.auth.getUser()` can resolve the founder's session server-side
 * — the previous @supabase/supabase-js client read from localStorage,
 * which is browser-only and made server-side auth checks impossible.
 *
 * Reads from the pranix_agents control plane (mvdjyjccvioxircxuzgz).
 * All data reads still go through RLS using the anon key. Writes go
 * through MCP tools (lib/pranix-mcp.ts), never this client.
 *
 * NOTE: this function stays synchronous to preserve every existing call
 * site in lib/queries.ts. Next 14's cookies() is synchronous; if/when
 * this repo upgrades to Next 15, cookies() becomes async and this
 * function must be awaited at every call site.
 */
export function createServerClient() {
  const cookieStore = cookies()

  return createSsrServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // setAll was called from a Server Component, which cannot
          // mutate cookies. The middleware refresh loop handles token
          // rotation, so swallowing this is safe.
        }
      },
    },
  })
}

/**
 * Browser-side Supabase client for the login flow.
 *
 * Now backed by @supabase/ssr's createBrowserClient, which writes the
 * session to HTTP-only cookies that the server can read. The previous
 * @supabase/supabase-js client wrote to localStorage; server components
 * could not see those tokens, so getFounderSession() always returned
 * null and middleware-based gating was impossible.
 */
export function createBrowserClient() {
  return createSsrBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
