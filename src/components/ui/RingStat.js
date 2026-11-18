const R = 44
/** Largo del trazo del anillo (r = 44 en un viewBox de 100) */
export const RING_LENGTH = 2 * Math.PI * R
/**
 * Anillo de porcentaje. `value` es 0..100 o null (sin datos: "–" y anillo vacío).
 * El trazo lleva data-ring y el número data-count para que GSAP los anime.
 */
export function RingStat({ value, label, className = '', size = 'md' }) {
  const has = Number.isFinite(value)
  const offset = RING_LENGTH * (1 - (has ? value : 0) / 100)
  const box = size === 'sm' ? 'h-12 w-12' : 'h-[clamp(5.5rem,11vh,7rem)] w-[clamp(5.5rem,11vh,7rem)]'
  const num = size === 'sm' ? 'text-sm' : 'text-2xl'
  return (
    <div role="img" aria-label={has ? `${label} ${value} %` : `${label} sin datos`} className={`flex flex-col items-center ${className}`}>
      <div className={`relative ${box}`}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={R} fill="none" stroke="currentColor" strokeWidth="3" className="text-white/12" />
          <circle
            data-ring
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke="var(--color-oro)"
            strokeWidth="3"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={offset}
            data-offset={offset}
          />
        </svg>
        <p aria-hidden="true" className={`absolute inset-0 grid place-items-center font-display leading-none ${num}`}>
          <span>
            {has ? <span data-count={value}>{value}</span> : '–'}
            {has ? <span className="ml-0.5 font-sans text-[0.55em] text-claro/60">%</span> : null}
          </span>
        </p>
      </div>
      <p
        aria-hidden="true"
        className={`mt-2 text-center leading-tight text-claro/60 ${size === 'sm' ? 'font-mono text-[8px] tracking-[0.12em] uppercase' : 'text-[11px]'}`}
      >
        {label}
      </p>
    </div>
  )
}
