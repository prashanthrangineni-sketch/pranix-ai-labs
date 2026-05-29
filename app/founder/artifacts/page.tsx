import { getArtifactGovernance, type ArtifactRow } from '@/lib/artifacts'
import { FileText, Scale, Archive, Database, ShieldCheck } from 'lucide-react'
import { ArtifactControls, PurgeScratchButton } from './artifact-controls'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Artifacts' }

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-4">
      <div className="flex items-center gap-2 text-fg-muted">
        {icon}
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-fg-primary leading-none">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-fg-muted">{sub}</p>}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'canonical' || status === 'active'
      ? 'bg-accent-subtle text-accent'
      : 'bg-elevated text-fg-muted'
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>{status}</span>
}

function Row({ r, controls }: { r: ArtifactRow; controls?: boolean }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <p className="text-[13px] font-medium text-fg-primary truncate flex-1 min-w-0">{r.title}</p>
        <StatusPill status={r.status} />
        {r.founder_reviewed && <ShieldCheck className="h-3.5 w-3.5 text-accent shrink-0" aria-label="Founder reviewed" />}
      </div>
      <p className="text-[11px] text-fg-muted mt-0.5">
        {r.kind} · {r.row_count ?? 0} records · source: {r.source_table ?? '—'} · retention: {r.retention}
      </p>
      {controls && (
        <div className="mt-2 pt-2 border-t border-border-subtle">
          <ArtifactControls id={r.id} status={r.status} reviewed={r.founder_reviewed} />
        </div>
      )}
    </div>
  )
}

export default async function ArtifactsPage() {
  const g = await getArtifactGovernance()

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-fg-primary tracking-tight">Artifact Governance</h1>
        <p className="text-[13px] text-fg-muted mt-1">
          One canonical index for every document, legal record, and build artifact across Pranix.
          {g.totalEntries === 0 ? ' Nothing cataloged yet.' : ` ${g.totalEntries} governed entries.`}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat icon={<FileText className="h-4 w-4" />} label="Canonical" value={String(g.canonical.length)} sub="documents & legal" />
        <Stat icon={<Scale className="h-4 w-4" />} label="Legal hold" value={String(g.legalHold)} sub="never auto-purged" />
        <Stat icon={<Archive className="h-4 w-4" />} label="Archived scratch" value={String(g.purgeableTables)} sub="legacy build tables" />
        <Stat icon={<Database className="h-4 w-4" />} label="Purgeable rows" value={g.purgeableRows.toLocaleString('en-IN')} sub="recoverable until purged" />
      </div>

      {g.byKind.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[12px] uppercase tracking-wide text-fg-muted mb-2">By kind</h2>
          <div className="flex flex-wrap gap-2">
            {g.byKind.map((k) => (
              <div key={k.kind} className="rounded-md border border-border-subtle bg-surface px-3 py-1.5 text-[12px]">
                <span className="text-fg-primary font-medium">{k.kind.replace(/_/g, ' ')}</span>
                <span className="text-fg-muted"> · {k.entries} {k.entries === 1 ? 'entry' : 'entries'} · {k.rows.toLocaleString('en-IN')} rows</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending review (D.4) */}
      <div className="mb-6">
        <h2 className="text-[13px] font-medium text-fg-primary mb-2">Pending review</h2>
        {g.pendingReview.length === 0 ? (
          <p className="text-[13px] text-fg-muted rounded-lg border border-dashed border-border-subtle p-4">Nothing awaiting review.</p>
        ) : (
          <div className="space-y-2">
            {g.pendingReview.map((r) => <Row key={r.id} r={r} controls />)}
          </div>
        )}
      </div>

      {/* Canonical stores */}
      <div className="mb-6">
        <h2 className="text-[13px] font-medium text-fg-primary mb-2">Canonical stores</h2>
        {g.canonical.length === 0 ? (
          <p className="text-[13px] text-fg-muted rounded-lg border border-dashed border-border-subtle p-4">No canonical stores cataloged.</p>
        ) : (
          <div className="space-y-2">
            {g.canonical.map((r) => <Row key={r.id} r={r} controls />)}
          </div>
        )}
      </div>

      {/* Archived build scratch */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="text-[13px] font-medium text-fg-primary">Archived build scratch</h2>
          <PurgeScratchButton />
        </div>
        <p className="text-[12px] text-fg-muted mb-3">
          Legacy outputs from past agent runs, retained for history and marked purgeable. Dropping them routes through the
          Permission Center for founder approval — nothing is deleted automatically.
        </p>
        {g.archived.length === 0 ? (
          <p className="text-[13px] text-fg-muted rounded-lg border border-dashed border-border-subtle p-4">No archived artifacts.</p>
        ) : (
          <div className="rounded-lg border border-border-subtle bg-surface divide-y divide-border-subtle max-h-[420px] overflow-y-auto">
            {g.archived.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2">
                <Archive className="h-3.5 w-3.5 text-fg-disabled shrink-0" />
                <span className="flex-1 min-w-0 text-[12px] text-fg-secondary truncate font-mono">{r.source_table ?? r.title}</span>
                <span className="text-[11px] text-fg-muted shrink-0">{r.row_count ?? 0} rows</span>
                <span className="text-[10px] text-fg-disabled shrink-0 hidden sm:inline">{r.origin}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
