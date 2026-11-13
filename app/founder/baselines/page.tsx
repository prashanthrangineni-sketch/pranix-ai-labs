import type { Metadata } from 'next'
import { Eye, AlertTriangle, Check } from 'lucide-react'
import { getReviewArtifacts, type ReviewArtifact } from '@/lib/queries'
import { REVIEW_WINDOW_DAYS } from '@/lib/baselines'
import { ApproveBaselineButton } from './approve-baseline-button'

export const metadata: Metadata = { title: 'Visual Regression' }
export const revalidate = 30

// Claim #4 part 2 (13 Nov 2026): one card per check (its newest run, only while it needs attention),
// the last REVIEW_WINDOW_DAYS days only, and the approved / new / difference pictures side by side.

export default async function FounderBaselinesPage() {
  const artifacts = await getReviewArtifacts()
  const failing   = artifacts.filter(a => a.status === 'fail')
  const reviewing = artifacts.filter(a => a.status === 'review')

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-fg-muted" />
          <h1 className="text-lg font-semibold text-fg-primary">Visual Regression</h1>
        </div>
        <p className="text-[11px] text-fg-muted">
          Screenshots of our sites are taken several times a day and compared with the picture you approved.
          Each check appears once, with its newest screenshot, only while it needs you. Last {REVIEW_WINDOW_DAYS} days.
        </p>
      </div>

      <Section label={`Changed a lot (${failing.length})`} emphasis={failing.length > 0} empty="Nothing has changed a lot.">
        {failing.map(a => <ArtifactCard key={a.id} artifact={a} variant="fail" />)}
      </Section>

      <Section label={`Needs your look (${reviewing.length})`} empty="Nothing waiting for you.">
        {reviewing.map(a => <ArtifactCard key={a.id} artifact={a} variant="review" />)}
      </Section>

      <p className="text-[10px] text-fg-disabled">
        If the new screenshot looks right, tap &quot;Approve as baseline&quot;: it becomes the picture future screenshots are compared with.
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

const REASONS: Record<string, string> = {
  width_changed: 'the page became wider or narrower',
  page_length_changed: 'the page became much longer or shorter',
}

function Picture({ url, label, alt }: { url: string | null; label: string; alt: string }) {
  return (
    <figure className="space-y-1 min-w-0">
      <figcaption className="text-[10px] text-fg-muted">{label}</figcaption>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer noopener">
          <img src={url} alt={alt} className="rounded border border-border-subtle w-full max-h-64 object-contain object-top bg-canvas" loading="lazy" />
        </a>
      ) : (
        <div className="rounded border border-border-subtle bg-canvas h-24 flex items-center justify-center text-[10px] text-fg-disabled">not available</div>
      )}
    </figure>
  )
}

function ArtifactCard({ artifact, variant }: { artifact: ReviewArtifact; variant: 'fail' | 'review' }) {
  const variantClass = variant === 'fail' ? 'border-severity-warn/30 bg-severity-warn/5' : 'border-border-subtle bg-surface'
  const compared = !!artifact.baseline_url
  const summary = !compared
    ? 'no approved picture yet'
    : `${artifact.diff_score !== null ? (artifact.diff_score * 100).toFixed(2) : '?'}% different` +
      (artifact.reason && REASONS[artifact.reason] ? ` (${REASONS[artifact.reason]})` : '')

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${variantClass}`}>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="font-mono text-fg-primary">{artifact.project_name}</span>
        <span className="text-fg-muted">/</span>
        <span className="font-mono text-fg-secondary">{artifact.check_name}</span>
        <span className="ml-auto text-fg-disabled" data-numeric>{artifact.viewport}</span>
      </div>

      {!artifact.is_image ? (
        artifact.signed_url
          ? <a href={artifact.signed_url} target="_blank" rel="noreferrer noopener" className="text-[11px] underline text-fg-secondary">Open the recording</a>
          : <p className="text-[11px] text-fg-disabled">recording unavailable</p>
      ) : compared ? (
        <div className="grid grid-cols-3 gap-2">
          <Picture url={artifact.baseline_url} label="Approved" alt={`${artifact.check_name} approved`} />
          <Picture url={artifact.signed_url} label="Now" alt={`${artifact.check_name} now`} />
          <Picture url={artifact.diff_url} label="Changes (red)" alt={`${artifact.check_name} changes`} />
        </div>
      ) : (
        <Picture url={artifact.signed_url} label="Now" alt={artifact.check_name} />
      )}

      <div className="flex items-center gap-2 text-[10px] text-fg-disabled">
        {variant === 'fail'
          ? <AlertTriangle className="h-3 w-3 text-severity-warn" />
          : <Check className="h-3 w-3" />
        }
        <span>{summary}</span>
        <span className="ml-auto font-mono">{new Date(artifact.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {artifact.approvable
        ? <ApproveBaselineButton artifactId={artifact.id} />
        : <p className="text-[10px] text-fg-disabled">This one cannot be approved as a baseline.</p>}
    </div>
  )
}
