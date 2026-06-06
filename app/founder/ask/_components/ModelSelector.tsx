'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronDown, Loader2, Zap, WifiOff, KeyRound, Lock, CheckCircle2 } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
export type ModelStatus = 'available' | 'offline' | 'missing_key' | 'founder_only'

export type ModelOption = {
  model_id: string          // unique UI key ("provider_name|model_id" or "auto")
  provider: string
  display_name: string
  task_types: string[]
  is_free: boolean
  enabled: boolean
  status: ModelStatus
  status_reason: string | null
  engine_model_id: string   // forwarded to engine verbatim
}

const LS_KEY = 'pranix_selected_model'
const AUTO: ModelOption = {
  model_id: 'auto',
  provider: 'Pranix',
  display_name: 'Auto',
  task_types: ['all'],
  is_free: true,
  enabled: true,
  status: 'available',
  status_reason: null,
  engine_model_id: 'auto',
}

// ── Status helpers ─────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: ModelStatus }) {
  if (status === 'available')    return <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
  if (status === 'offline')      return <WifiOff      className="h-3 w-3 text-severity-critical shrink-0" />
  if (status === 'missing_key')  return <KeyRound     className="h-3 w-3 text-severity-warn shrink-0" />
  if (status === 'founder_only') return <Lock         className="h-3 w-3 text-fg-muted shrink-0" />
  return null
}

function statusLabel(status: ModelStatus): string {
  if (status === 'available')    return 'Available'
  if (status === 'offline')      return 'Offline'
  if (status === 'missing_key')  return 'Missing API Key'
  if (status === 'founder_only') return 'Founder Select Only'
  return status
}

function statusBadge(status: ModelStatus): string {
  if (status === 'available')    return 'bg-success/10 text-success'
  if (status === 'offline')      return 'bg-severity-critical/10 text-severity-critical'
  if (status === 'missing_key')  return 'bg-severity-warn/10 text-severity-warn'
  if (status === 'founder_only') return 'bg-elevated text-fg-disabled'
  return 'bg-elevated text-fg-muted'
}

// ── ModelSelector ───────────────────────────────────────────────────────────────
interface Props {
  selectedModel: ModelOption
  onSelect: (model: ModelOption) => void
}

export function ModelSelector({ selectedModel, onSelect }: Props) {
  const [models, setModels]   = useState<ModelOption[]>([AUTO])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/models')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const list: ModelOption[] = data.models ?? [AUTO]
      setModels(list.length > 0 ? list : [AUTO])

      // Re-sync selected model with fresh data (preserves choice if still available)
      try {
        const storedId = localStorage.getItem(LS_KEY)
        if (storedId && storedId !== 'auto') {
          const match = list.find((m) => m.model_id === storedId)
          if (match && match.status === 'available') {
            onSelect(match)
          }
        }
      } catch { }
    } catch {
      // Silently fall back to Auto if endpoint is unreachable
      setModels([AUTO])
    } finally {
      setLoading(false)
    }
  }, [onSelect])

  useEffect(() => { fetchModels() }, [fetchModels])

  function handleSelect(model: ModelOption) {
    if (model.status !== 'available') return   // disabled guard
    onSelect(model)
    try { localStorage.setItem(LS_KEY, model.model_id) } catch { }
    setOpen(false)
  }

  const isAuto = selectedModel.model_id === 'auto'

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={[
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors',
          open
            ? 'border-accent/50 bg-accent-subtle text-accent'
            : 'border-border-subtle bg-canvas text-fg-secondary hover:border-accent/40 hover:bg-elevated hover:text-fg-primary',
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select model"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-fg-disabled" />
        ) : isAuto ? (
          <Zap className="h-3.5 w-3.5 text-accent" />
        ) : (
          <StatusIcon status={selectedModel.status} />
        )}
        <span className="max-w-[120px] truncate">{selectedModel.display_name}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute bottom-full left-0 z-50 mb-1.5 w-72 max-h-72 overflow-y-auto rounded-xl border border-border-subtle bg-surface shadow-lg"
          role="listbox"
          aria-label="Model list"
        >
          {/* Group: Auto */}
          <div className="px-2 pt-2 pb-1">
            <p className="px-2 pb-1 text-[10px] uppercase tracking-widest text-fg-disabled font-semibold">Routing</p>
            {models.filter((m) => m.model_id === 'auto').map((m) => (
              <ModelRow key={m.model_id} model={m} active={selectedModel.model_id === m.model_id} onSelect={handleSelect} />
            ))}
          </div>

          {/* Group by provider */}
          {Array.from(
            models
              .filter((m) => m.model_id !== 'auto')
              .reduce((acc, m) => {
                const grp = acc.get(m.provider) ?? []
                grp.push(m)
                acc.set(m.provider, grp)
                return acc
              }, new Map<string, ModelOption[]>())
              .entries()
          ).map(([provider, group]) => (
            <div key={provider} className="px-2 pb-1.5">
              <p className="px-2 py-1 text-[10px] uppercase tracking-widest text-fg-disabled font-semibold">{provider}</p>
              {group.map((m) => (
                <ModelRow key={m.model_id} model={m} active={selectedModel.model_id === m.model_id} onSelect={handleSelect} />
              ))}
            </div>
          ))}

          {models.length <= 1 && !loading && (
            <p className="px-4 py-3 text-[12px] text-fg-disabled">No models configured</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Single model row inside the dropdown ───────────────────────────────────────
function ModelRow({
  model, active, onSelect,
}: {
  model: ModelOption
  active: boolean
  onSelect: (m: ModelOption) => void
}) {
  const unavailable = model.status !== 'available'
  return (
    <button
      role="option"
      aria-selected={active}
      aria-disabled={unavailable}
      disabled={unavailable}
      onClick={() => onSelect(model)}
      title={model.status_reason ?? statusLabel(model.status)}
      className={[
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
        unavailable
          ? 'cursor-not-allowed opacity-50'
          : active
            ? 'bg-accent-subtle'
            : 'hover:bg-elevated',
      ].join(' ')}
    >
      <StatusIcon status={model.status} />

      <div className="flex-1 min-w-0">
        <span className={`block truncate text-[13px] font-medium leading-snug ${active ? 'text-accent' : 'text-fg-primary'}`}>
          {model.display_name}
        </span>
        {model.task_types.length > 0 && model.task_types[0] !== 'all' && (
          <span className="text-[11px] text-fg-disabled">{model.task_types.join(', ')}</span>
        )}
      </div>

      {/* Status badge */}
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadge(model.status)}`}>
        {statusLabel(model.status)}
      </span>
    </button>
  )
}

// ── useModelSelector hook — manages model state + localStorage restore ──────────
export function useModelSelector() {
  const [selectedModel, setSelectedModel] = useState<ModelOption>(AUTO)

  // Restore from localStorage on mount (only the id; full object resolved after fetch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (!stored || stored === 'auto') return
      // We just keep Auto until ModelSelector itself re-syncs after fetch
    } catch { }
  }, [])

  return { selectedModel, setSelectedModel }
}
