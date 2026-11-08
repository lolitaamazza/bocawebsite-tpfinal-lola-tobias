/** Filtro tipo píldora: contorno en reposo, relleno claro cuando está activo */
export function Pill({ pressed, children, className = '', ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`pointer-events-auto flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-4 font-mono text-[11px] tracking-[0.16em] text-claro/75 uppercase transition-colors hover:border-white/40 hover:text-claro aria-pressed:border-claro aria-pressed:bg-claro aria-pressed:text-fondo md:h-auto md:px-2.5 md:py-1.5 md:text-[10px] md:tracking-[0.18em] ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
