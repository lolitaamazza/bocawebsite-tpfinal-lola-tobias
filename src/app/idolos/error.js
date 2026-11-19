'use client'

import Link from 'next/link'

/** Si falla el salón (por ejemplo, la animación), se puede reintentar o ir a las fichas. */
export default function IdolosError({ error, reset }) {
  return (
    <main className="paper-grunge grid min-h-dvh place-items-center px-6 text-center text-claro">
      <div>
        <p className="eyebrow text-oro">Algo falló</p>
        <h1 className="mt-2 font-display text-4xl uppercase">Se apagaron las luces del salón</h1>
        <p className="mt-3 max-w-md text-claro/60">{error?.message || 'Error inesperado.'}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="eyebrow h-10 rounded-full bg-oro px-5 text-fondo">
            Reintentar
          </button>
          <Link href="/" className="eyebrow inline-flex h-10 items-center rounded-full border border-claro/30 px-5">
            Volver al vestuario
          </Link>
        </div>
      </div>
    </main>
  )
}
