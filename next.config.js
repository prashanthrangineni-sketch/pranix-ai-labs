/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Existing static HTML files coexist at repo root.
  // Next.js build output lives in .next/ — no conflict.
  // Vercel build config switch happens in a separate PR after founder approval.
  async redirects() {
    return [
      // Phase G4 — consolidate the legacy provider page into the canonical AI Workspace.
      // workspace/page.tsx already renders <ProviderControls/> (imported from ../orchestrate),
      // so this redirect loses no functionality. /ai, /vault, /actions are intentionally left
      // intact for now — they hold unique flows (activation/vault/actions) not yet folded into
      // workspace; consolidating them is a follow-up to keep this change non-breaking.
      { source: '/founder/orchestrate', destination: '/founder/workspace', permanent: false },
    ]
  },
}

module.exports = nextConfig
