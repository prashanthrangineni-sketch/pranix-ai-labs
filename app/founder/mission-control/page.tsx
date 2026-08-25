import type { Metadata } from 'next'
import { getPendingGrants, getOrchestrationProviders, getLatestVideos } from '@/lib/queries'
import { MissionControl } from '../_components/MissionControl'
import { JarvisStatusPane } from '../_components/JarvisStatusPane'

export const metadata: Metadata = { title: 'Mission Control' }
export const revalidate = 60

// Mission Control lived on the Overview page until 2026-08-25.
//
// MissionControl.tsx is ~98 KB and ~2,400 lines — three times the size of the
// page that imported it — and renders fifteen-plus API-backed panes behind two
// independent polling loops (30 s overview, 60 s recommendations). Sitting it
// underneath the founder's at-a-glance summary is what made that page feel,
// in his words, like "huge things which scare everyone".
//
// It is a dashboard in its own right, so it gets its own route. JarvisStatusPane
// comes with it: its grant-approval half duplicates what the Needs You queue
// already shows on Overview, and its provider status belongs next to Mission
// Control's own provider pane rather than three screens away.
//
// Nothing inside either component changed. This is a move, not a rewrite.
export default async function MissionControlPage() {
  const [grants, providers, recentVideos] = await Promise.all([
    getPendingGrants(),
    getOrchestrationProviders(),
    getLatestVideos(5),
  ])

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-fg-primary">Mission Control</h1>
        <p className="text-[12px] text-fg-muted mt-1">
          Live operational detail — approvals, operations, execution, autonomy and learning.
          Refreshes on its own schedule.
        </p>
      </div>

      <section aria-label="JARVIS Status Pane">
        <JarvisStatusPane initialGrants={grants} providers={providers} recentVideos={recentVideos} />
      </section>

      <section aria-label="Mission Control">
        <MissionControl />
      </section>
    </div>
  )
}
