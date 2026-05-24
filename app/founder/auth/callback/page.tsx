'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  )
}

function CallbackInner() {
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
