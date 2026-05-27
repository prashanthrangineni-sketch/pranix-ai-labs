import { createServerClient as createSsrServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Hard-coded fallback URL — project is public, URL is safe to expose in source.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://mvdjyjccvioxircxuzgz.supabase.co'

// NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in Vercel environment variables.
// See: Supabase Dashboard → project mvdjyjccvioxircxuzgz → Project Settings → API → anon/public key.
// This env var MUST be added in: Vercel personal account → pranix-ai-labs project → Settings → Environment Variables.
// Without it the middleware and all Server Components will fail to auth.
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (!SUPABASE_ANON_KEY && process.env.NODE_ENV === 'production') {
  // Log clearly — this is the #1 deployment failure cause.
  console.error('[pranix-ai-labs] MISSING ENV VAR: NEXT_PUBLIC_SUPABASE_ANON_KEY — founder auth will fail. Add this to Vercel env vars: Supabase > mvdjyjccvioxircxuzgz > Settings > API > anon public key.')
}

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
          // Server Component context — middleware handles token rotation
        }
      },
    },
  })
}
