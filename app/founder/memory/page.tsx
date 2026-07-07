import type { Metadata } from 'next'
import { getMemoryEntries, getSemanticMemoryEntries } from '@/lib/queries'
import { Database, Clock, Brain, ShieldCheck, Sparkles } from 'lucide-react'

export const metadata: Metadata = { title: 'Memory' }
export const revalidate = 300

const SCOPE_LABELS: Record<string, string> = {
  constitutional: 'Constitutional Rules',
  founder: 'Founder Facts',
  business: 'Business Facts',
  semantic: 'Semantic Knowledge',
  episodic: 'Episodic History',
  working: 'Working Memory',
}

const SCOPE_ORDER = ['constitutional', 'founder', 'business', 'semantic', 'episodic', 'working']

export default async function FounderMemoryPage() {
  const [entries, semanticEntries] = await Promise.all([
    getMemoryEntries(),
    getSemanticMemoryEntries(),
  ])

  const grouped = entries.reduce<Record<string, typeof entries>>((acc, entry) => {
    const proj = entry.project || 'unknown'
    if (!acc[proj]) acc[proj] = []
    acc[proj].push(entry)
    return acc
  }, {})

  const semanticGrouped = semanticEntries.reduce<Record<string, typeof semanticEntries>>((acc, entry) => {
    const scope = entry.scope || 'semantic'
    if (!acc[scope]) acc[scope] = []
    acc[scope].push(entry)
    return acc
  }, {})

  const orderedScopes = [
    ...SCOPE_ORDER.filter((s) => semanticGrouped[s]?.length),
    ...Object.keys(semanticGrouped).filter((s) => !SCOPE_ORDER.includes(s)),
  ]

  return (
    <div className="px-4 py-6 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-fg-muted" />
          <h1 className="text-lg font-semibold text-fg-primary">What Aaria Remembers About You</h1>
        </div>
        <p className="text-xs text-fg-muted">
          {semanticEntries.length} long-term memories across {orderedScopes.length} scope{orderedScopes.length !== 1 ? 's' : ''} — decisions, preferences, and facts agents have learned across every session, not just the current one.
        </p>

        {semanticEntries.length === 0 && (
          <p className="text-xs text-fg-disabled italic">No long-term memories recorded yet.</p>
        )}

        {orderedScopes.map((scope) => {
          const items = semanticGrouped[scope]
          return (
            <div key={scope} className="rounded-lg border border-border-subtle bg-surface p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-fg-muted" />
                <h2 className="text-sm font-medium text-fg-primary">{SCOPE_LABELS[scope] || scope}</h2>
                <span className="text-xs text-fg-muted">({items.length})</span>
              </div>

              <div className="space-y-2">
                {items.map((entry) => (
                  <div key={entry.id} className="rounded-md bg-canvas p-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-fg-secondary leading-relaxed">{entry.content}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        {entry.is_protected && <ShieldCheck className="h-3 w-3 text-severity-warn" />}
                        {entry.is_anchor && <Sparkles className="h-3 w-3 text-fg-muted" />}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-fg-disabled">
                      <span>{entry.project}</span>
                      <span>·</span>
                      <span>salience {entry.salience}</span>
                      <span>·</span>
                      <span>{new Date(entry.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-2 pt-4 border-t border-border-subtle">
        <h2 className="text-sm font-semibold text-fg-primary">Execution Memory (short-term)</h2>
        <p className="text-xs text-fg-muted">{entries.length} entries across {Object.keys(grouped).length} project{Object.keys(grouped).length !== 1 ? 's' : ''} — job-scoped checkpoints, not long-term knowledge.</p>

        {Object.entries(grouped).map(([project, items]) => (
          <div key={project} className="rounded-lg border border-border-subtle bg-surface p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-4 w-4 text-fg-muted" />
              <h2 className="text-sm font-medium text-fg-primary">{project}</h2>
              <span className="text-xs text-fg-muted">({items.length})</span>
            </div>

            <div className="space-y-2">
              {items.map((entry) => {
                const isExpired = entry.expires_at && new Date(entry.expires_at) < new Date()
                return (
                  <details key={entry.id} className="group">
                    <summary className="flex items-center justify-between cursor-pointer text-xs py-1 hover:bg-elevated/50 rounded px-1 -mx-1">
                      <span className={`font-mono truncate max-w-[70%] ${isExpired ? 'text-fg-disabled line-through' : 'text-fg-secondary'}`}>
                        {entry.key}
                      </span>
                      <span className="text-fg-disabled shrink-0">
                        {new Date(entry.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </summary>
                    <div className="mt-1 rounded-md bg-canvas p-2 text-xs">
                      <pre className="font-mono text-fg-muted whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                        {JSON.stringify(entry.value, null, 2)}
                      </pre>
                      {entry.expires_at && (
                        <div className={`mt-1 text-[10px] ${isExpired ? 'text-severity-error' : 'text-fg-disabled'}`}>
                          {isExpired ? 'Expired' : 'Expires'} {new Date(entry.expires_at).toLocaleDateString('en-IN')}
                        </div>
                      )}
                    </div>
                  </details>
                )
              })}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-1 text-xs text-fg-disabled">
          <Clock className="h-3 w-3" />
          <span>Refreshes every 5 minutes</span>
        </div>
      </div>
    </div>
  )
}
