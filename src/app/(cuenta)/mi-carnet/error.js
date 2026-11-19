'use client'

import Link from 'next/link'

/** No se pudo leer el carnet (Firestore o sesión): reintentar o ir al editor público */
export default function MiCarnetError({ retry, reset }) {
  return (
    <div className="rounded-2xl border border-red-400/30 bg-red-500/[0.06] p-6">
      <p className="eyebrow text-red-300">No pudimos cargar tu carnet</p>
      <p className="mt-2 text-claro/75">Puede ser un problema de conexión. Mientras tanto podés diseñar y descargar uno en el editor.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => (retry ?? reset)?.()} className="eyebrow h-10 rounded-full bg-oro px-5 text-fondo">
          Reintentar
        </button>
        <Link href="/carnet" className="eyebrow inline-flex h-10 items-center rounded-full border border-white/15 px-5 text-claro/80 hover:border-white/40">
          Ir al editor
        </Link>
      </div>
    </div>
  )
}
