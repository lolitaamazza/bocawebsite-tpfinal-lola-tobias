/** Mientras se leen las partidas del usuario */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Cargando partidas">
      <div className="h-3 w-40 rounded bg-white/10" />
      <div className="mt-3 h-10 w-64 rounded bg-white/10" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-52 rounded-2xl border border-white/10 bg-white/[0.04]" />
        ))}
      </div>
    </div>
  )
}
