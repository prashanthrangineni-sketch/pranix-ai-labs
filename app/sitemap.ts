import type { MetadataRoute } from 'next'

// Task #22 (SEO/SEM/AEO) Phase 1 — sitemap over the real public routes.
// Note: supersedes the legacy root-level sitemap.xml (which lists old .html
// pages and is not served by the Next.js build).
const BASE = 'https://www.pranixailabs.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE}/`,
      priority: 1,
      changeFrequency: 'weekly',
    },
    {
      url: `${BASE}/products`,
      priority: 0.9,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE}/infrastructure`,
      priority: 0.9,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE}/status`,
      priority: 0.5,
      changeFrequency: 'daily',
    },
  ]
}
