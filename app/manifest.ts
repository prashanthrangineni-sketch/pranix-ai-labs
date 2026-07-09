import type { MetadataRoute } from 'next'

/**
 * PWA Web App Manifest — Next.js 14 route handler.
 * Served at /manifest.webmanifest (auto-linked via app/layout.tsx metadata.manifest).
 *
 * Icons: place icon-192.png and icon-512.png in /public/ before going live.
 * The manifest is functional without icons but Chrome won't show an install
 * prompt until both sizes are present and reachable.
 *
 * start_url: /founder — founder operational cockpit is the primary surface.
 * display: standalone — removes browser chrome, full-screen feel on Android.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pranix AI Labs',
    short_name: 'Pranix',
    description: 'Founder operational cockpit — Pranix AI Labs',
    start_url: '/founder',
    display: 'standalone',
    background_color: '#0e1014',
    theme_color: '#0e1014',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'en-IN',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['productivity', 'business'],
    shortcuts: [
      {
        name: 'Mission Control',
        url: '/founder/missions',
        description: 'Missions, workers, and verified state',
      },
      {
        name: 'Task Queue',
        url: '/founder/tasks',
        description: 'View operational task queue',
      },
      {
        name: 'Alerts',
        url: '/founder/alerts',
        description: 'View system alerts',
      },
      {
        name: 'Approvals',
        url: '/founder/approvals',
        description: 'Approve pending MCP grants',
      },
    ],
  }
}
