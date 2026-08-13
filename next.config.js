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

      // NOTE: there is deliberately no /favicon.ico redirect here.
      //
      // One used to point /favicon.ico -> /icon.png because /favicon.ico was
      // 404ing. That is no longer true: scripts/generate-icons.mjs writes a real
      // public/favicon.ico (16/32/48, transparent) on every build.
      //
      // Do not reintroduce it. Next.js evaluates redirects BEFORE filesystem
      // routes, so a redirect here makes the generated favicon unreachable and
      // pins Google Search to whatever the destination renders — and
      // app/icon.png/route.tsx renders with background '#F9F9FA', i.e. the white
      // plate this project spent a long time removing.
    ]
  },
  // Charters section (app/founder/charters) reads content/charters/*.md via
  // fs.readFileSync at request time (see lib/charters.ts) — ensure Vercel's
  // serverless file-tracer bundles those markdown files into the function output.
  //
  // Next 14.2 expects this under `experimental`. At the top level it is ignored
  // with "Invalid next.config.js options detected: Unrecognized key(s) in
  // object: 'outputFileTracingIncludes'", so the markdown was never actually
  // being traced into the function bundle.
  experimental: {
    outputFileTracingIncludes: {
      '/founder/charters': ['./content/charters/**'],
    },
  },
}

module.exports = nextConfig
