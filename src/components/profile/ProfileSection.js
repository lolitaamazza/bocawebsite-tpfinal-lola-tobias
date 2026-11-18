/** Formato de números del perfil (1.260). GSAP usa el mismo al contar. */
export const fmt = (n) => Math.round(n).toLocaleString('es-AR')

/** Bloque del panel de vidrio: rótulo chico en mayúsculas y contenido */
export function ProfileSection({ label, className = '', children }) {
  return (
    <section data-p-item data-p-swap className={`rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 wide:p-4 ${className}`}>
      <h3 className="eyebrow text-[9px] text-claro/45">{label}</h3>
      <div className="mt-2.5 wide:mt-3">{children}</div>
    </section>
  )
}

/**
 * Número grande con unidad y rótulo. Si es número y `count`, lleva data-count
 * para que GSAP lo cuente desde 0. null se muestra como "–".
 */
export function Figure({ value, unit, label, count = true, lead }) {
  const has = value !== null && value !== undefined
  const counts = has && count && Number.isFinite(value)
  return (
    <div className="min-w-0">
      <p className="flex items-center font-display text-[1.6rem] leading-none whitespace-nowrap wide:text-[clamp(1.8rem,2.5vw,2.4rem)]">
        {lead}
        {has ? counts ? <span data-count={value}>{fmt(value)}</span> : <span>{value}</span> : '–'}
        {has && unit ? <span className="ml-1 font-sans text-xs text-claro/55 wide:text-sm">{unit}</span> : null}
      </p>
      <p className="mt-1.5 truncate text-[10px] text-claro/55 wide:text-[11px]">{label}</p>
    </div>
  )
}
