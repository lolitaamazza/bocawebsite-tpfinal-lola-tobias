/** Encabezado de las páginas de la cuenta: rótulo, título y acciones a la derecha */
export function PageHead({ eyebrow, title, children, description }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow text-oro">{eyebrow}</p>
        <h1 className="mt-1 font-display text-4xl leading-none uppercase md:text-5xl">{title}</h1>
        {description ? <p className="mt-2 max-w-xl text-claro/60">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  )
}

/** Aviso de éxito que llega por ?ok= después de una Server Action */
export function Flash({ ok, messages }) {
  const text = ok ? messages[ok] : null
  if (!text) return null
  return (
    <p role="status" className="mt-6 rounded-xl border border-oro/30 bg-oro/[0.08] px-4 py-3 text-sm text-oro">
      {text}
    </p>
  )
}

export const buttonClass = 'eyebrow inline-flex h-10 items-center gap-2 rounded-full px-5 text-[11px] transition-[filter,border-color]'
export const primaryButton = `${buttonClass} bg-oro text-fondo shadow-lg shadow-black/40 hover:brightness-110`
export const ghostButton = `${buttonClass} border border-white/15 text-claro/80 hover:border-white/40 hover:text-claro`
