/** Mientras el servidor arma la página de la trivia */
export default function Loading() {
  return (
    <div className="grid animate-pulse gap-10 lg:grid-cols-[1.1fr_1fr]" aria-busy="true" aria-label="Cargando">
      <div>
        <div className="h-3 w-40 rounded bg-white/10" />
        <div className="mt-4 h-24 w-full max-w-md rounded-xl bg-white/10" />
        <div className="mt-5 h-4 w-full max-w-lg rounded bg-white/10" />
        <div className="mt-2 h-4 w-2/3 max-w-lg rounded bg-white/10" />
      </div>
      <div className="h-96 rounded-3xl border border-white/10 bg-white/[0.04]" />
    </div>
  )
}
