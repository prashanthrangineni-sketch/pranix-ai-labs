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
      url: `${BASE}/about`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE}/services`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE}/aaria`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE}/contact`,
      priority: 0.7,
      changeFrequency: 'monthly',
    },
    {
      url: `${BASE}/status`,
      priority: 0.5,
      changeFrequency: 'daily',
    },
    // Legal pages — required to be publicly reachable and indexable for
    // payment-aggregator onboarding and Play Store data-safety review.
    {
      url: `${BASE}/privacy`,
      priority: 0.6,
      changeFrequency: 'yearly',
    },
    {
      url: `${BASE}/terms`,
      priority: 0.6,
      changeFrequency: 'yearly',
    },
    {
      url: `${BASE}/refunds`,
      priority: 0.6,
      changeFrequency: 'yearly',
    },
  ]
}
