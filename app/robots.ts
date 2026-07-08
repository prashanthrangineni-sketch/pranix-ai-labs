import type { MetadataRoute } from 'next'

// Task #22 (SEO/SEM/AEO) Phase 1 — baseline robots.
// /founder is already noindexed via vercel.json headers; excluded here as well.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/founder/', '/api/'],
      },
    ],
    sitemap: 'https://www.pranixailabs.com/sitemap.xml',
  }
}
