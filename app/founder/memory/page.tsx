import type { Metadata } from 'next'
import { getMemoryEntries } from '@/lib/queries'
import { Database, Clock } from 'lucide-react'

export const metadata: Metadata = { title: 'Memory' }
export const revalidate = 300

export default async function FounderMemoryPage() {
  const entries = await getMemoryEntries()

  const grouped = entries.reduce<Record<string, typeof entries>>((acc, entry) => {
    const proj = entry.project || 'unknown'
    if (!acc[proj]) acc[proj] = []
    acc[proj].push(entry)
    return acc
  }, {})

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-lg font-semibold text-fg-primary">Execution Memory</h1>
      <p className="text-xs text-fg-muted">{entries.length} entries across {Object.keys(grouped).length} project{Object.keys(grouped).length !== 1 ? 's' : ''}</p>

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
  )
}
