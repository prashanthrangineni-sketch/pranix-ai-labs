'use client'

// Command Centre Phase 0 (task #29): one-click "Install Pranix" affordance.
// - Chrome/Edge/Android: captures beforeinstallprompt and triggers the native
//   install dialog on click ("Pranix" icon lands on desktop/home screen).
// - iOS Safari: no install prompt API exists — shows Add-to-Home-Screen steps.
// - Hidden entirely when already running as the installed app (standalone).

import { useEffect, useState } from 'react'
import { MonitorDown, Share, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPranixApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(true) // assume installed until proven otherwise
  const [isIos, setIsIos] = useState(false)
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari legacy flag
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent))

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (isStandalone || installed) return null

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-fg-secondary">
          <MonitorDown className="h-4 w-4 text-fg-muted shrink-0" />
          <span>
            Get the <span className="font-medium text-fg-primary">Pranix</span> app icon on this device — one tap to your
            cockpit, no browser.
          </span>
        </div>
        {deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="shrink-0 rounded-md bg-elevated px-3 py-1.5 text-xs font-medium text-fg-primary border border-border-subtle hover:bg-canvas"
          >
            Install Pranix
          </button>
        ) : (
          <button
            onClick={() => setShowIosHelp((v) => !v)}
            className="shrink-0 rounded-md bg-elevated px-3 py-1.5 text-xs font-medium text-fg-primary border border-border-subtle hover:bg-canvas"
          >
            {showIosHelp ? <X className="h-3.5 w-3.5" /> : 'How to install'}
          </button>
        )}
      </div>

      {showIosHelp && isIos && (
        <div className="mt-2 rounded-md bg-canvas p-2 text-xs text-fg-muted space-y-1">
          <p className="flex items-center gap-1">
            1. Tap the <Share className="h-3 w-3 inline" /> <span className="font-medium">Share</span> button in Safari.
          </p>
          <p>
            2. Choose <span className="font-medium text-fg-secondary">"Add to Home Screen"</span>.
          </p>
          <p>
            3. Tap <span className="font-medium text-fg-secondary">Add</span> — the Pranix icon appears on your home screen.
          </p>
        </div>
      )}
    </div>
  )
}
