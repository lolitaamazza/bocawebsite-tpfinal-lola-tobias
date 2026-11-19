'use client'

import Link from 'next/link'
import { useEffect } from 'react'

/** Error en la Bombonera: se puede reintentar sin recargar todo, o volver al vestuario. */
export default function BomboneraError({ error, retry, reset }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <main className="grid min-h-dvh place-items-center bg-fondo px-6 text-center">
      <div>
        <p className="eyebrow text-oro">Algo falló</p>
        <h1 className="mt-2 font-display text-4xl uppercase">Se apagaron los reflectores</h1>
        <p className="mt-3 max-w-md text-claro/60">No pudimos mostrar la Bombonera. Probá de nuevo.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={() => (retry ?? reset)?.()} className="eyebrow h-10 rounded-full bg-oro px-5 text-fondo">
            Reintentar
          </button>
          <Link href="/" className="eyebrow inline-flex h-10 items-center rounded-full border border-oro/40 px-5 text-oro">
            Volver al vestuario
          </Link>
        </div>
      </div>
    </main>
  )
}
