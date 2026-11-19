import { TriviaGame } from '@/components/trivia/TriviaGame'
import { CATEGORIES, normalizeSeed, parseCategory } from '@/lib/domain/trivia'
import { bank } from '../bank'

const description = 'Diez preguntas sobre Boca Juniors: títulos, camisetas del archivo, el plantel actual y la historia del club. 20 segundos por pregunta y ranking de hinchas.'

export const metadata = {
  title: 'Trivia xeneize',
  description,
  alternates: { canonical: '/trivia' },
  openGraph: { title: 'Trivia xeneize · ¿Cuánto sabés de Boca?', description, url: '/trivia' },
}

/** Cuántas preguntas tiene cada categoría (solo el número: el banco no sale del servidor) */
const counts = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.key === 'mixta' ? bank.length : bank.filter((q) => q.category === c.key).length]),
)

/**
 * Server Component: lee ?semilla= y ?categoria= (link de "jugá la misma ronda")
 * y monta el juego, que es un Client Component.
 */
export default async function TriviaPage({ searchParams }) {
  const sp = await searchParams
  const seed = normalizeSeed(sp?.semilla)
  const category = parseCategory(sp?.categoria) || 'mixta'
  return <TriviaGame key={`${seed}-${category}`} initialSeed={seed} initialCategory={category} counts={counts} />
}
