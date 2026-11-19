'use client'

import Link from 'next/link'

/** Error inesperado en el editor: se puede reintentar sin perder la cabecera */
export default function CarnetError({ retry, reset }) {
  return (
    <div className="rounded-3xl border border-red-400/30 bg-red-500/[0.06] px-6 py-12 text-center">
      <p className="eyebrow text-red-300">Algo falló</p>
      <p className="mt-2 font-display text-3xl uppercase">No pudimos armar el carnet</p>
      <p className="mx-auto mt-2 max-w-md text-claro/65">Puede ser un problema de conexión. Probá de nuevo; si sigue, volvé en un rato.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => (retry ?? reset)?.()} className="eyebrow h-10 rounded-full bg-oro px-5 text-fondo">
          Reintentar
        </button>
        <Link href="/" className="eyebrow inline-flex h-10 items-center rounded-full border border-white/15 px-5 text-claro/80 hover:border-white/40">
          Volver al vestuario
        </Link>
      </div>
    </div>
  )
}
