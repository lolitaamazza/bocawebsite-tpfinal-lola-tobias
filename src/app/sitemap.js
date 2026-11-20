import { squad } from '@/data'
import { idolos } from '@/data/idolos'

const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4950'

/** Rutas públicas, incluidas las fichas de jugadores e ídolos. */
export default function sitemap() {
  const now = new Date()
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/museo`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/cronologia`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/idolos`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/bombonera`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/trivia`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/trivia/ranking`, changeFrequency: 'daily', priority: 0.5 },
    { url: `${base}/carnet`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/personaliza`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    ...squad.map((p) => ({ url: `${base}/dorsal/${p.dorsal}`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 })),
    ...idolos.map((idolo) => ({ url: `${base}/idolos/${idolo.slug}`, changeFrequency: 'monthly', priority: 0.6 })),
  ]
}
