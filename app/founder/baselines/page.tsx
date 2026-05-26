import type { Metadata } from 'next'
import { Eye, AlertTriangle, Check } from 'lucide-react'
import { getReviewArtifacts, type ReviewArtifact } from '@/lib/queries'
import { ApproveBaselineButton } from './approve-baseline-button'

export const metadata: Metadata = { title: 'Visual Regression' }
export const revalidate = 30

export default async function FounderBaselinesPage() {
  const artifacts = await getReviewArtifacts()
  const failing   = artifacts.filter(a => a.status === 'fail')
  const reviewing = artifacts.filter(a => a.status === 'review')

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Eye className="h-5 w-5 text-fg-muted" />
        <h1 className="text-lg font-semibold text-fg-primary">Visual Regression</h1>
      </div>

      <Section label={`Failing (${failing.length})`} emphasis={failing.length > 0} empty="No visual regressions detected.">
        {failing.map(a => <ArtifactCard key={a.id} artifact={a} variant="fail" />)}
      </Section>

      <Section label={`Awaiting review (${reviewing.length})`} empty="No screenshots awaiting baseline approval.">
        {reviewing.map(a => <ArtifactCard key={a.id} artifact={a} variant="review" />)}
      </Section>

      <p className="text-[10px] text-fg-disabled">
        Tap "Approve as baseline" to make a screenshot the reference for future diffs.
      </p>
    </div>
  )
}

function Section({ label, emphasis, empty, children }: {
  label: string; emphasis?: boolean; empty: string; children: React.ReactNode
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children]
  return (
    <section className="space-y-2">
      <h2 className={`text-xs font-medium ${emphasis ? 'text-severity-warn' : 'text-fg-muted'}`}>{label}</h2>
      {items.length === 0 ? (
        <p className="rounded-lg border border-border-subtle bg-surface px-4 py-3 text-xs text-fg-muted">{empty}</p>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  )
}

function ArtifactCard({ artifact, variant }: { artifact: ReviewArtifact; variant: 'fail' | 'review' }) {
  const variantClass = variant === 'fail' ? 'border-severity-warn/30 bg-severity-warn/5' : 'border-border-subtle bg-surface'
  const diffPct = artifact.diff_score !== null ? `${(artifact.diff_score * 100).toFixed(2)}% diff` : 'no baseline yet'

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${variantClass}`}>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="font-mono text-fg-primary">{artifact.project_name}</span>
        <span className="text-fg-muted">/</span>
        <span className="font-mono text-fg-secondary">{artifact.check_name}</span>
        <span className="ml-auto text-fg-disabled" data-numeric>{artifact.viewport}</span>
      </div>

      {artifact.signed_url ? (
        <a href={artifact.signed_url} target="_blank" rel="noreferrer noopener">
          <img
            src={artifact.signed_url}
            alt={artifact.check_name}
            className="rounded border border-border-subtle w-full max-h-64 object-contain bg-canvas"
            loading="lazy"
          />
        </a>
      ) : (
        <div className="rounded border border-border-subtle bg-canvas h-32 flex items-center justify-center text-xs text-fg-disabled">
          screenshot unavailable
        </div>
      )}

      <div className="flex items-center gap-2 text-[10px] text-fg-disabled">
        {variant === 'fail'
          ? <AlertTriangle className="h-3 w-3 text-severity-warn" />
          : <Check className="h-3 w-3" />
        }
        <span>{diffPct}</span>
        <span className="ml-auto font-mono">id {artifact.id.slice(0, 8)}</span>
      </div>

      <ApproveBaselineButton artifactId={artifact.id} />
    </div>
  )
}
