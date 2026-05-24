'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Legacy magic-link callback page.
 *
 * Kept as a safety net for any stale magic-link emails that were sent
 * before the auth gate landed. The new flow points emailRedirectTo at
 * /founder/auth/confirm (a Route Handler that exchanges the code for
 * a server-readable session cookie).
 *
 * This page no longer attempts the exchange itself — the old
 * @supabase/supabase-js + localStorage approach silently failed under
 * the cookie-based auth model. Instead, it forwards the `code` query
 * parameter to the new handler so the user lands signed in.
 *
 * Safe to delete in a follow-up PR once you're confident no stale
 * magic links remain in inboxes.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const next = searchParams.get('next')

    if (!code) {
      router.replace('/founder/login?error=missing_code')
      return
    }

    const params = new URLSearchParams({ code })
    if (next) params.set('next', next)
    router.replace(`/founder/auth/confirm?${params.toString()}`)
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex items-center gap-2 text-sm text-fg-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Signing in...
      </div>
    </div>
  )
}
