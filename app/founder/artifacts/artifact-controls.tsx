'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { Check, Archive, Trash2, ShieldCheck, Loader2 } from 'lucide-react'
import { artifactAction, requestScratchPurge } from './actions'

function Btn({ onClick, disabled, children, tone = 'default' }: {
  onClick: () => void
  disabled: boolean
  children: ReactNode
  tone?: 'default' | 'danger'
}) {
  const cls =
    tone === 'danger'
      ? 'border-border-subtle text-fg-muted hover:text-red-500 hover:border-red-500/40'
      : 'border-border-subtle text-fg-muted hover:text-fg-primary hover:bg-elevated'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-2 py-1 text-[11px] transition-colors disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  )
}

export function ArtifactControls({ id, status, reviewed }: { id: string; status: string; reviewed: boolean }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function run(action: string) {
    setMsg(null)
    start(async () => {
      const res = await artifactAction(id, action)
      setMsg(res.message)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status !== 'canonical' && (
        <Btn onClick={() => run('mark_canonical')} disabled={pending}>
          <Check className="inline h-3 w-3 mr-1" />Canonical
        </Btn>
      )}
      {!reviewed && (
        <Btn onClick={() => run('mark_reviewed')} disabled={pending}>
          <ShieldCheck className="inline h-3 w-3 mr-1" />Reviewed
        </Btn>
      )}
      {status !== 'superseded' && (
        <Btn onClick={() => run('mark_superseded')} disabled={pending}>Superseded</Btn>
      )}
      <Btn onClick={() => run('request_archive')} disabled={pending} tone="danger">
        <Archive className="inline h-3 w-3 mr-1" />Archive…
      </Btn>
      <Btn onClick={() => run('request_purge')} disabled={pending} tone="danger">
        <Trash2 className="inline h-3 w-3 mr-1" />Purge…
      </Btn>
      {pending && <Loader2 className="h-3 w-3 animate-spin text-fg-muted" />}
      {msg && <span className="text-[11px] text-fg-muted">{msg}</span>}
    </div>
  )
}

export function PurgeScratchButton() {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          setMsg(null)
          start(async () => {
            const r = await requestScratchPurge()
            setMsg(r.message)
          })
        }}
        disabled={pending}
        className="rounded-md border border-border-subtle px-2.5 py-1 text-[11px] text-fg-muted hover:text-red-500 hover:border-red-500/40 transition-colors disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Request purge of archived scratch'}
      </button>
      {msg && <span className="text-[11px] text-fg-muted">{msg}</span>}
    </div>
  )
}
