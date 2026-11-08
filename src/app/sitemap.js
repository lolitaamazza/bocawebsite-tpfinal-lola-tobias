import { squad } from '@/data'

const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4950'

/** Rutas públicas: home, personalizador y una ficha por dorsal */
export default function sitemap() {
  const now = new Date()
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/personaliza`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    ...squad.map((p) => ({ url: `${base}/dorsal/${p.dorsal}`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 })),
  ]
}
