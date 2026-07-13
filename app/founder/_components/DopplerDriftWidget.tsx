'use client'

import React from 'react'
import { ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react'
import driftData from './doppler_drift.json'

const PRODUCT_LABELS: Record<string, string> = {
  schoolos: 'SchoolOS',
  vidyagrid: 'VidyaGrid',
  quickscanz: 'QuickScanZ',
  cart2save: 'Cart2Save',
  quietkeep: 'QuietKeep',
  pranix_site: 'Pranix Site',
  pranix_agents: 'Pranix Agents'
}

export function DopplerDriftWidget() {
  const products = Object.keys(PRODUCT_LABELS)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-fg-secondary">
          Live verification of configured secrets against project definitions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {products.map((p) => {
          const drift = driftData[p as keyof typeof driftData]
          const missing = drift ? drift.missing : []
          const hasDrift = missing.length > 0

          return (
            <div
              key={p}
              className={`rounded-lg border p-3 flex items-start gap-3 transition-colors ${
                hasDrift
                  ? 'border-severity-critical/30 bg-severity-critical/5'
                  : 'border-border-subtle bg-surface'
              }`}
            >
              {hasDrift ? (
                <ShieldAlert className="h-5 w-5 text-severity-critical shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-severity-success shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-fg-primary">
                    {PRODUCT_LABELS[p]}
                  </p>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      hasDrift
                        ? 'bg-severity-critical/15 text-severity-critical'
                        : 'bg-severity-success/15 text-severity-success'
                    }`}
                  >
                    {hasDrift ? 'drift detected' : 'synchronized'}
                  </span>
                </div>
                {hasDrift ? (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-xs text-fg-secondary">
                      The following keys are missing in the Vercel live environment:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {missing.map((key) => (
                        <span
                          key={key}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-severity-critical/10 text-severity-critical border border-severity-critical/20"
                        >
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-fg-disabled mt-1">
                    All required environment secrets are active on Vercel.
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
