import Link from 'next/link'

/**
 * Atajos al estilo "QuickLinks" de la referencia: filas grandes separadas por
 * líneas finas. Al pasar el puntero la fila se llena de oro desde la izquierda.
 */
export function QuickLinks({ items }) {
  return (
    <nav aria-label="Atajos" className="mx-auto w-full max-w-6xl px-[clamp(1.25rem,4vw,3rem)]">
      <h2 data-reveal-up className="font-display text-[clamp(2.4rem,5vw,4.5rem)] leading-none uppercase">
        Atajos
      </h2>
      <ul className="mt-8 border-t border-white/15">
        {items.map((it, i) => {
          const inner = (
            <>
              <span className="absolute inset-0 origin-left scale-x-0 bg-oro transition-transform duration-500 ease-telon group-hover:scale-x-100 group-focus-visible:scale-x-100" />
              <span className="relative w-14 font-mono text-[11px] text-claro/40 transition-colors group-hover:text-fondo/60">{String(i + 1).padStart(2, '0')}</span>
              <span className="relative flex-1 text-[clamp(1.25rem,2.6vw,2.2rem)] font-semibold tracking-tight transition-colors group-hover:text-fondo">{it.label}</span>
              <span className="relative hidden max-w-[28ch] text-sm text-claro/45 transition-colors group-hover:text-fondo/70 md:block">{it.hint}</span>
              <span className="relative ml-6 text-xl transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-fondo">→</span>
            </>
          )
          const cls = 'group relative flex w-full items-center overflow-hidden border-b border-white/15 px-2 py-6 text-left md:px-4 md:py-7'
          return (
            <li key={it.label} data-reveal-up>
              {it.href ? (
                <Link href={it.href} className={cls}>
                  {inner}
                </Link>
              ) : (
                <button type="button" onClick={it.onClick} className={cls}>
                  {inner}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
