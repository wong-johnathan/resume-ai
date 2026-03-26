import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://resume.johnathanwwh.com',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: 'https://resume.johnathanwwh.com/terms',
      lastModified: new Date('2026-03-26'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://resume.johnathanwwh.com/privacy',
      lastModified: new Date('2026-03-26'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
