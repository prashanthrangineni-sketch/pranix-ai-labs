/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Existing static HTML files coexist at repo root.
  // Next.js build output lives in .next/ — no conflict.
  // Vercel build config switch happens in a separate PR after founder approval.
}

module.exports = nextConfig
