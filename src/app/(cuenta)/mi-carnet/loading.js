/** Mientras se lee el carnet de Firestore */
export default function Loading() {
  return (
    <div className="animate-pulse motion-reduce:animate-none" aria-busy="true" aria-label="Cargando tu carnet">
      <div className="h-4 w-40 rounded bg-white/10" />
      <div className="mt-3 h-10 w-72 max-w-full rounded bg-white/10" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="aspect-[856/540] rounded-[3.74%/5.93%] border border-white/10 bg-white/[0.05]" />
        <div className="h-80 rounded-2xl border border-white/10 bg-white/[0.04]" />
      </div>
    </div>
  )
}
