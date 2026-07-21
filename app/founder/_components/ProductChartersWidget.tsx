'use client'

import React from 'react'
import { ShieldCheck, AlertTriangle, ShieldAlert, Activity, CheckCircle2, ChevronRight } from 'lucide-react'
import type { ProductCharterSummary } from '@/lib/queries'

function statusBadge(status: string) {
  switch (status) {
    case 'live':
      return { label: 'Live', cls: 'text-severity-success bg-severity-success/12 border border-severity-success/20' }
    case 'pilot':
      return { label: 'Pilot', cls: 'text-accent bg-accent-subtle border border-accent/20' }
    case 'pre_launch':
      return { label: 'Pre-launch', cls: 'text-severity-warn bg-severity-warn/12 border border-severity-warn/20' }
    default:
      return { label: status, cls: 'text-fg-disabled bg-elevated' }
  }
}

function healthBadge(health: 'green' | 'yellow' | 'red', label: string) {
  switch (health) {
    case 'green':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-severity-success bg-severity-success/10 border border-severity-success/20 px-2 py-0.5 rounded-full">
          <ShieldCheck className="h-3 w-3" /> Healthy
        </span>
      )
    case 'yellow':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-severity-warn bg-severity-warn/10 border border-severity-warn/20 px-2 py-0.5 rounded-full">
          <AlertTriangle className="h-3 w-3" /> {label}
        </span>
      )
    case 'red':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-severity-critical bg-severity-critical/10 border border-severity-critical/20 px-2 py-0.5 rounded-full">
          <ShieldAlert className="h-3 w-3" /> {label}
        </span>
      )
  }
}

export function ProductChartersWidget({ charters }: { charters: ProductCharterSummary[] }) {
  if (!charters || charters.length === 0) return null

  const thc = 'text-left text-[10px] uppercase tracking-wide text-fg-disabled font-medium pb-2 px-3'
  const tdc = 'text-[12px] text-fg-secondary py-2.5 px-3 align-middle'

  return (
    <div className="rounded-xl border border-border-subtle bg-surface flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-severity-success" />
          <span className="text-[12px] font-semibold text-fg-primary uppercase tracking-wide">
            Product Charters &amp; Health Summary (8 Live Products)
          </span>
        </div>
        <span className="text-[11px] text-fg-disabled">
          Real-time 1-line health signals
        </span>
      </div>

      <div className="overflow-x-auto p-2">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr>
              <th className={thc}>Product</th>
              <th className={thc}>Stage</th>
              <th className={thc}>1-Line Health</th>
              <th className={thc}>Open Findings</th>
              <th className={thc}>Active Sprint Mission</th>
            </tr>
          </thead>
          <tbody>
            {charters.map((p) => {
              const sb = statusBadge(p.status)
              return (
                <tr key={p.productKey} className="border-t border-border-subtle/50 hover:bg-surface-hover/40 transition-colors">
                  <td className={`${tdc} font-semibold text-fg-primary`}>
                    {p.name}
                  </td>
                  <td className={tdc}>
                    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${sb.cls}`}>
                      {sb.label}
                    </span>
                  </td>
                  <td className={tdc}>
                    {healthBadge(p.health, p.healthLabel)}
                  </td>
                  <td className={`${tdc} tabular-nums`}>
                    {p.openAlertsCount > 0 ? (
                      <span className="text-severity-warn font-medium">{p.openAlertsCount} signals</span>
                    ) : (
                      <span className="text-fg-disabled">0 open</span>
                    )}
                  </td>
                  <td className={`${tdc} max-w-[280px] truncate`}>
                    {p.activeSprintMission ? (
                      <span className="text-fg-primary font-medium truncate block">
                        {p.activeSprintMission}
                      </span>
                    ) : (
                      <span className="text-fg-disabled italic">No active mission</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ProductChartersWidget
