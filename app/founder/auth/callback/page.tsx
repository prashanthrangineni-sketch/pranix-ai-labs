'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient()

    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.replace('/founder')
      }
    })

    // Handle the hash fragment from Supabase magic link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/founder')
      }
    })
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex items-center gap-2 text-sm text-fg-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        Signing in...
      </div>
    </div>
  )
}
