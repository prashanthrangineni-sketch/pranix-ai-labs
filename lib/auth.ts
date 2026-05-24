import { createServerClient } from './supabase'

/**
 * Check if the current request has a valid founder session.
 * Returns the founder email if authenticated, null otherwise.
 * 
 * Uses Supabase Auth JWT from cookies + checks dashboard_founders allowlist.
 * This is a server-side check — never exposed to the client.
 */
export async function getFounderSession(): Promise<{ email: string } | null> {
  try {
    const supabase = createServerClient()

    // Get session from Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user?.email) return null

    // Verify against founder allowlist
    const { data: founder } = await supabase
      .from('dashboard_founders')
      .select('email')
      .eq('email', user.email)
      .single()

    if (!founder) return null

    return { email: founder.email }
  } catch {
    return null
  }
}
