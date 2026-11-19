/** Mientras se lee el ranking de Firestore */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Cargando ranking">
      <div className="h-3 w-48 rounded bg-white/10" />
      <div className="mt-3 h-10 w-56 rounded bg-white/10" />
      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-white/[0.06] px-4 py-4">
            <div className="h-6 w-6 rounded bg-white/10" />
            <div className="h-4 flex-1 rounded bg-white/10" />
            <div className="h-6 w-16 rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  )
}
