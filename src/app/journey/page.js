import { Journey } from '@/components/journey/Journey'
import { journey } from '@/data/journey'

export const metadata = {
  title: 'Journey 2000–2026',
  description: 'El recorrido de Boca Juniors año por año, de la Intercontinental de Tokio en 2000 al plantel de 2026, con fotos reales.',
  alternates: { canonical: '/journey' },
}

/** Página pública. El recorrido anima en el cliente; acá queda el texto para buscadores y lectores. */
export default function JourneyPage() {
  return (
    <>
      <h1 className="sr-only">Boca Juniors, Journey 2000–2026</h1>
      <ol className="sr-only">
        {journey.map((h) => (
          <li key={h.year}>
            {h.year}, {h.month}: {h.text}
          </li>
        ))}
      </ol>
      <Journey />
    </>
  )
}
