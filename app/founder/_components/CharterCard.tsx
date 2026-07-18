'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'
import type { Charter } from '@/lib/charters'

function renderLines(text: string) {
  // Lightweight inline-bold renderer for **word** spans — avoids pulling in
  // a markdown dependency for what is otherwise plain text with occasional
  // **STATUS** emphasis (PASS/FAIL/DEGRADED) and numbered/bulleted lines.
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    return (
      <p key={i} className="text-[12.5px] text-fg-secondary leading-relaxed">
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={j} className="text-fg-primary font-semibold">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
      </p>
    )
  })
}

function Section({ label, text }: { label: string; text: string }) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-accent">{label}</p>
      <div className="space-y-1">{renderLines(text)}</div>
    </div>
  )
}

export function CharterCard({ charter }: { charter: Charter }) {
  const [open, setOpen] = useState(false)
  const summary = charter.whatItIs.split('\n')[0]?.slice(0, 140) ?? ''

  return (
    <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-elevated transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="h-4 w-4 text-accent shrink-0" />
          <div className="min-w-0">
            <span className="text-[13px] font-semibold text-fg-primary">{charter.productName}</span>
            {!open && (
              <p className="text-[11px] text-fg-muted truncate mt-0.5">{summary}</p>
            )}
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-fg-disabled shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-fg-disabled shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border-subtle">
          <p className="text-[10px] text-fg-disabled">Charter dated {charter.dateLabel}</p>
          <Section label="What it is" text={charter.whatItIs} />
          <Section label="Founder needs" text={charter.founderNeeds} />
          <Section label="Live-verified" text={charter.liveVerified} />
          <Section label="Next 3" text={charter.next3} />
        </div>
      )}
    </div>
  )
}
