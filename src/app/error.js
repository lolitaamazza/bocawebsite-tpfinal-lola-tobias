'use client'

/** Error inesperado en cualquier página: se puede reintentar sin recargar todo. */
export default function GlobalError({ error, reset }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-fondo px-6 text-center">
      <div>
        <p className="eyebrow text-oro">Algo falló</p>
        <h1 className="mt-2 font-display text-4xl uppercase">Se cortó la luz del vestuario</h1>
        <p className="mt-3 max-w-md text-claro/60">{error?.message || 'Error inesperado.'}</p>
        <button type="button" onClick={reset} className="eyebrow mt-6 h-10 rounded-full bg-oro px-5 text-fondo">
          Reintentar
        </button>
      </div>
    </main>
  )
}
