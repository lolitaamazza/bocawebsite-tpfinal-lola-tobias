/** Casillero de estadística de la ficha: número grande arriba, rótulo chico abajo */
export function StatTile({ value, extra, label }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-1.5 py-1.5 text-center">
      <p className="flex items-center justify-center gap-1 font-display text-xl leading-none whitespace-nowrap">
        {value}
        {extra ? <span className="ml-0.5 font-mono text-[9px] text-claro/50">{extra}</span> : null}
      </p>
      <p className="mt-1 font-mono text-[9px] tracking-[0.12em] text-claro/50 uppercase landscape:text-[8px] landscape:tracking-[0.14em]">
        {label}
      </p>
    </div>
  )
}
