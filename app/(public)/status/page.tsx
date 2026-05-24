import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Status',
  description: 'Operational status of Pranix AI Labs infrastructure and products.',
}

export default function StatusPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <h1 className="text-xl font-semibold md:text-2xl">Operational Status</h1>
      <p className="mt-2 text-sm text-fg-secondary">
        Live infrastructure health. Data sourced from the Pranix control plane.
      </p>

      <div className="mt-10 space-y-6">
        <div className="rounded-lg border border-border-subtle bg-surface p-5">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-severity-success" />
            <span className="text-base font-medium text-fg-primary">
              All systems operational
            </span>
          </div>
          <p className="mt-2 text-xs text-fg-muted">
            Status data will be populated from the control plane in Phase 1.
            This page will show per-product deployment health, worker freshness,
            and inference tier availability.
          </p>
        </div>

        {STATUS_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-lg border border-border-subtle bg-surface p-5"
          >
            <h2 className="text-sm font-semibold text-fg-primary">
              {section.title}
            </h2>
            <p className="mt-1 text-xs text-fg-muted">
              {section.placeholder}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

const STATUS_SECTIONS = [
  { title: 'Product Deployment Health', placeholder: 'Per-product status from v_infra_topology — Phase 1.' },
  { title: 'Worker Freshness', placeholder: 'Last heartbeat per worker tier — Phase 1.' },
  { title: 'MCP Gateway', placeholder: 'Tools deployed, manifest version — Phase 1.' },
  { title: 'Inference Tiers', placeholder: 'Tier availability (on/off only, no costs) — Phase 1.' },
] as const
