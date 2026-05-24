import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://mvdjyjccvioxircxuzgz.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Browser-side Supabase client for the magic-link login flow.
 *
 * Backed by @supabase/ssr's createBrowserClient, which writes the
 * session to HTTP-only cookies that the server can read. The previous
 * @supabase/supabase-js client wrote to localStorage; server
 * components could not see those tokens, so getFounderSession() always
 * returned null and middleware-based gating was impossible.
 *
 * BROWSER-ONLY: only used by 'use client' components (currently just
 * the login page). The server equivalent lives in lib/supabase.ts and
 * pulls auth from cookies() via next/headers — that module cannot be
 * imported from client code because Next.js rejects next/headers in
 * the client bundle.
 */
export function createBrowserClient() {
  return createSsrBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
