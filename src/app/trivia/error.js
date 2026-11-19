'use client'

import Link from 'next/link'

/** Error al leer el ranking o las partidas (Firestore): se puede reintentar sin recargar */
export default function TriviaError({ error, reset }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-red-400/30 bg-red-500/[0.06] p-6">
      <p className="eyebrow text-red-300">No pudimos cargar la trivia</p>
      <p className="mt-2 text-claro/75">{error?.message || 'Error inesperado.'}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="eyebrow h-10 rounded-full bg-oro px-5 text-fondo">
          Reintentar
        </button>
        <Link href="/trivia" className="eyebrow inline-flex h-10 items-center rounded-full border border-white/15 px-5 text-claro/80">
          Volver a jugar
        </Link>
      </div>
    </div>
  )
}
