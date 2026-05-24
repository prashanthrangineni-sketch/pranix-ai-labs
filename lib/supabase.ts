import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mvdjyjccvioxircxuzgz.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Server-side Supabase client for use in Server Components and Route Handlers.
 * Reads from the pranix_agents control plane (mvdjyjccvioxircxuzgz).
 * 
 * This client uses the anon key — all reads go through RLS.
 * Writes should NEVER use this client; writes go through MCP tools.
 */
export function createServerClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })
}

/**
 * Browser-side Supabase client for auth flows (magic link).
 * Only used for authentication — never for direct data reads in the founder dashboard.
 * Data reads use Server Components with the server client above.
 */
export function createBrowserClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
