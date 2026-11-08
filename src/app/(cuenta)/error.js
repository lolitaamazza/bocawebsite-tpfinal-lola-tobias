'use client'

/** Error al leer o escribir en Firestore dentro del área privada */
export default function CuentaError({ error, reset }) {
  return (
    <div className="rounded-2xl border border-red-400/30 bg-red-500/[0.06] p-6">
      <p className="eyebrow text-red-300">No pudimos cargar esto</p>
      <p className="mt-2 text-claro/75">{error?.message || 'Error inesperado.'}</p>
      <button type="button" onClick={reset} className="eyebrow mt-4 h-10 rounded-full bg-oro px-5 text-fondo">
        Reintentar
      </button>
    </div>
  )
}
