import type { Metadata } from 'next'
import { Film, Camera, AlertTriangle } from 'lucide-react'
import { getEvidenceArtifacts, type EvidenceArtifact } from '@/lib/queries'

export const metadata: Metadata = { title: 'Evidence' }
export const revalidate = 30

// Evidence feed — every artifact the browser worker produced, newest first.
// Videos (artifact_type=video) render with a player; screenshots render inline.
// Failure screenshots (failure_step_*) live here, not on the VR page.

export default async function FounderEvidencePage() {
  const artifacts = await getEvidenceArtifacts(60)
  const videos = artifacts.filter(a => a.artifact_type === 'video')
  const shots  = artifacts.filter(a => a.artifact_type !== 'video')

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Camera className="h-5 w-5 text-fg-muted" />
        <h1 className="text-lg font-semibold text-fg-primary">Evidence</h1>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-medium text-fg-muted flex items-center gap-1.5">
          <Film className="h-3.5 w-3.5" /> Flow videos ({videos.length})
        </h2>
        {videos.length === 0 ? (
          <p className="rounded-lg border border-border-subtle bg-surface px-4 py-3 text-xs text-fg-muted">
            No flow videos yet. Queue a browser flow with capture.video=true.
          </p>
        ) : (
          <div className="space-y-3">
            {videos.map(a => <VideoCard key={a.id} artifact={a} />)}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-medium text-fg-muted">Screenshots ({shots.length})</h2>
        <div className="space-y-3">
          {shots.map(a => <ShotCard key={a.id} artifact={a} />)}
        </div>
      </section>
    </div>
  )
}

function CardHeader({ artifact }: { artifact: EvidenceArtifact }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="font-mono text-fg-primary">{artifact.project_name}</span>
      <span className="text-fg-muted">/</span>
      <span className="font-mono text-fg-secondary">{artifact.check_name}</span>
      <span className="ml-auto text-fg-disabled" data-numeric>{artifact.viewport}</span>
    </div>
  )
}

function CardFooter({ artifact }: { artifact: EvidenceArtifact }) {
  const failed = artifact.status === 'fail'
  return (
    <div className="flex items-center gap-2 text-[10px] text-fg-disabled">
      {failed && <AlertTriangle className="h-3 w-3 text-severity-warn" />}
      <span>{failed ? 'captured on failure' : artifact.status}</span>
      <span className="ml-auto" data-numeric>{new Date(artifact.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
    </div>
  )
}

function VideoCard({ artifact }: { artifact: EvidenceArtifact }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-3 space-y-2">
      <CardHeader artifact={artifact} />
      {artifact.signed_url ? (
        <video
          src={artifact.signed_url}
          controls
          playsInline
          preload="metadata"
          className="rounded border border-border-subtle w-full bg-canvas"
        />
      ) : (
        <div className="rounded border border-border-subtle bg-canvas h-32 flex items-center justify-center text-xs text-fg-disabled">
          video unavailable
        </div>
      )}
      <CardFooter artifact={artifact} />
    </div>
  )
}

function ShotCard({ artifact }: { artifact: EvidenceArtifact }) {
  const failed = artifact.status === 'fail'
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${failed ? 'border-severity-warn/30 bg-severity-warn/5' : 'border-border-subtle bg-surface'}`}>
      <CardHeader artifact={artifact} />
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
      <CardFooter artifact={artifact} />
    </div>
  )
}
