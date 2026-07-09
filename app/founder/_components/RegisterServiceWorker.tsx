'use client'

// Registers the minimal service worker (public/sw.js) so the site passes
// Chrome/Edge/Android installability checks. Renders nothing.

import { useEffect } from 'react'

export default function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.warn('[pwa] service worker registration failed:', err))
    }
  }, [])

  return null
}
