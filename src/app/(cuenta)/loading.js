/** Mientras el servidor trae los datos de Firestore */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Cargando">
      <div className="h-4 w-28 rounded bg-white/10" />
      <div className="mt-3 h-10 w-64 rounded bg-white/10" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-72 rounded-2xl border border-white/10 bg-white/[0.04]" />
        ))}
      </div>
    </div>
  )
}
