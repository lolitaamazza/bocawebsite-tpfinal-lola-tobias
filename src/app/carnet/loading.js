/** Mientras el servidor lee la sesión y el carnet guardado */
export default function Loading() {
  return (
    <div className="animate-pulse motion-reduce:animate-none" aria-busy="true" aria-label="Cargando el carnet">
      <div className="h-3 w-48 rounded bg-white/10" />
      <div className="mt-4 h-20 w-72 max-w-full rounded bg-white/10 md:h-28 md:w-[28rem]" />
      <div className="mt-5 h-4 w-96 max-w-full rounded bg-white/10" />
      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="aspect-[856/540] rounded-[3.74%/5.93%] border border-white/10 bg-white/[0.05]" />
        <div className="grid content-start gap-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-2.5 w-24 rounded bg-white/10" />
              <div className="mt-2 h-11 rounded-lg bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
