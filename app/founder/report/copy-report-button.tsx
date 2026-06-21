'use client'

// Smallest-possible clipboard control. No new dependencies:
//  - lucide-react (Copy/Check) is already used across the founder shell
//  - navigator.clipboard is the primary path (secure context / https)
//  - a hidden <textarea> + execCommand('copy') is the fallback for older
//    mobile in-app webviews where the async Clipboard API is unavailable.
// Additive + reversible: this file and the /founder/report route can be
// deleted with zero impact on any other page.

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyReportButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.top = '0'
        ta.style.left = '0'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        ta.setSelectionRange(0, text.length)
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy the full report to clipboard"
      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-[12px] font-semibold text-fg-primary transition-colors hover:border-accent/40 hover:text-accent active:bg-elevated"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'COPY REPORT'}
    </button>
  )
}
