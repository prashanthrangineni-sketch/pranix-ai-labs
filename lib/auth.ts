import { createServerClient } from './supabase'

/**
 * Check if the current request has a valid founder session.
 *
 * Returns the founder email if authenticated and present in the
 * dashboard_founders allowlist, null otherwise.
 *
 * Reads the Supabase session from HTTP-only cookies via @supabase/ssr.
 * The middleware (middleware.ts) is the primary auth gate — this
 * function is for in-component checks (e.g. conditionally showing
 * destructive controls) where the middleware redirect isn't enough.
 *
 * Server-side only — never call from a Client Component.
 */
export async function getFounderSession(): Promise<{ email: string } | null> {
  try {
    const supabase = createServerClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user?.email) return null

    const { data: founder } = await supabase
      .from('dashboard_founders')
      .select('email')
      .eq('email', user.email)
      .maybeSingle()

    if (!founder) return null

    return { email: founder.email }
  } catch {
    return null
  }
}
