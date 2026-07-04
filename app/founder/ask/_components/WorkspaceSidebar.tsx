'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Loader2, MessagesSquare, FolderDot, ChevronRight, X } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
export type WorkspaceItem = {
  workspace_id: string
  name: string
  project: string | null
  message_count: number
  model: string
  last_msg_at?: string
}

// Fixed: was a cross-origin browser fetch straight to the agent-engine deployment
// (no auth header, blocked/failed silently -> "Could not load workspaces"). Now
// proxied through this app's own /api/founder/workspaces route, same pattern as
// every other founder/* data source (see app/api/founder/timeline/route.ts).
const WORKSPACES_API = '/api/founder/workspaces'
const LS_KEY = 'pranix_active_workspace'

// ── Helpers ──────────────────────────────────────────────────────────────────
function projectLabel(project: string | null) {
  if (!project) return null
  return project.charAt(0).toUpperCase() + project.slice(1)
}

function relativeTime(iso?: string) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── WorkspaceSidebar ─────────────────────────────────────────────────────────
interface Props {
  activeId: string | null
  onSelect: (id: string) => void
  /** Mobile: controlled open state */
  open: boolean
  onClose: () => void
}

export function WorkspaceSidebar({ activeId, onSelect, open, onClose }: Props) {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${AGENT_ENGINE}/api/workspaces`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const list: WorkspaceItem[] = data.workspaces ?? []
      setWorkspaces(list)
      // Auto-seed defaults if empty
      if (list.length === 0) {
        await fetch(`${AGENT_ENGINE}/api/workspaces/seed`, { method: 'POST' })
        const res2 = await fetch(`${AGENT_ENGINE}/api/workspaces`)
        const data2 = await res2.json()
        setWorkspaces(data2.workspaces ?? [])
      }
    } catch (e) {
      setError('Could not load workspaces')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWorkspaces() }, [fetchWorkspaces])

  async function createWorkspace() {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    try {
      const res = await fetch(`${AGENT_ENGINE}/api/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, model: 'auto' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.workspace_id) {
        const newWs: WorkspaceItem = {
          workspace_id: data.workspace_id,
          name,
          project: null,
          message_count: 0,
          model: 'auto',
        }
        setWorkspaces((prev) => [newWs, ...prev])
        onSelect(data.workspace_id)
        setNewName('')
        setShowNew(false)
      }
    } catch {
      setError('Could not create workspace')
    } finally {
      setCreating(false)
    }
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-surface">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-fg-disabled">
          Workspaces
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-fg-muted hover:bg-elevated hover:text-fg-primary transition-colors"
            aria-label="New workspace"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
          {/* Mobile close */}
          <button
            onClick={onClose}
            className="lg:hidden flex items-center justify-center h-7 w-7 rounded-md hover:bg-elevated text-fg-muted"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* New workspace input */}
      {showNew && (
        <div className="border-b border-border-subtle px-3 py-2.5 space-y-2">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createWorkspace()
              if (e.key === 'Escape') { setShowNew(false); setNewName('') }
            }}
            placeholder="Workspace name…"
            className="w-full rounded-lg border border-border-subtle bg-canvas px-2.5 py-1.5 text-[13px] text-fg-primary placeholder:text-fg-disabled focus:border-accent/50 focus:outline-none"
          />
          <div className="flex gap-1.5">
            <button
              onClick={createWorkspace}
              disabled={creating || !newName.trim()}
              className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-canvas disabled:opacity-40 transition-opacity"
            >
              {creating ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : 'Create'}
            </button>
            <button
              onClick={() => { setShowNew(false); setNewName('') }}
              className="rounded-lg border border-border-subtle px-3 py-1.5 text-[12px] text-fg-muted hover:bg-elevated"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Workspace list */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-fg-disabled" />
          </div>
        )}
        {!loading && error && (
          <p className="px-3 py-2 text-[12px] text-severity-critical">{error}</p>
        )}
        {!loading && !error && workspaces.length === 0 && (
          <p className="px-3 py-4 text-center text-[12px] text-fg-disabled">No workspaces yet</p>
        )}
        {!loading && workspaces.map((ws) => {
          const isActive = ws.workspace_id === activeId
          return (
            <button
              key={ws.workspace_id}
              onClick={() => { onSelect(ws.workspace_id); onClose() }}
              className={[
                'group w-full flex items-start gap-2.5 rounded-lg mx-1.5 px-2.5 py-2.5 text-left transition-colors',
                isActive
                  ? 'bg-accent-subtle text-fg-primary'
                  : 'hover:bg-elevated text-fg-secondary hover:text-fg-primary',
              ].join(' ')}
            >
              {/* Icon */}
              <span className={[
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                isActive ? 'bg-accent text-canvas' : 'bg-elevated text-fg-muted',
              ].join(' ')}>
                <MessagesSquare className="h-3.5 w-3.5" />
              </span>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className={`truncate text-[13px] font-medium leading-snug ${isActive ? 'text-accent' : ''}`}>
                    {ws.name}
                  </span>
                  {isActive && <ChevronRight className="h-3 w-3 shrink-0 text-accent" />}
                </div>

                <div className="mt-0.5 flex items-center gap-2">
                  {ws.project && (
                    <span className="flex items-center gap-0.5 text-[11px] text-fg-disabled">
                      <FolderDot className="h-2.5 w-2.5" />
                      {projectLabel(ws.project)}
                    </span>
                  )}
                  {ws.message_count > 0 && (
                    <span className="text-[11px] text-fg-disabled">
                      {ws.message_count} msg{ws.message_count !== 1 ? 's' : ''}
                    </span>
                  )}
                  {relativeTime(ws.last_msg_at) && (
                    <span className="text-[11px] text-fg-disabled ml-auto">
                      {relativeTime(ws.last_msg_at)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="hidden lg:flex w-52 shrink-0 flex-col border-r border-border-subtle overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile drawer — slides in from left */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          {/* Panel */}
          <div className="relative w-72 max-w-[85vw] h-full overflow-hidden shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
