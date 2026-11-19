import Link from 'next/link'
import { SiteMenu } from '@/components/layout/SiteMenu'
import { site } from '@/config/site'

/**
 * Marca de sección: escudo + título en Anton con la palabra clave en oro.
 * Es la misma en todas las páginas para que el sitio se lea como uno solo.
 * Con `titleAs="h1"` el título es el encabezado principal de la página.
 */
export function SectionBrand({ title, accent, subtitle, href = '/', label = 'Volver al vestuario', titleAs: Title = 'span', titleId }) {
  return (
    <div className="pointer-events-auto flex min-w-0 items-center gap-2.5">
      <Link href={href} aria-label={label} className="shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={site.crest.src} alt="" width={842} height={1000} className="h-9 w-auto" />
      </Link>
      <div className="min-w-0 leading-none">
        <Title id={titleId} className="-mt-[0.2em] block truncate pt-[0.2em] font-display text-lg leading-none uppercase">
          {title} {accent ? <span className="text-oro">{accent}</span> : null}
        </Title>
        {subtitle ? <p className="eyebrow mt-1 truncate text-[9px] text-claro/55">{subtitle}</p> : null}
      </div>
    </div>
  )
}

/** Enlace chico de la barra (secundario, a la derecha) */
export const headerLinkClass =
  'eyebrow pointer-events-auto shrink-0 rounded-full border border-transparent px-3 py-2 text-claro/65 transition-colors hover:text-claro aria-[current=page]:border-white/15 aria-[current=page]:bg-white/[0.06] aria-[current=page]:text-claro'

const VARIANTS = {
  // barra que acompaña el scroll (páginas de contenido)
  sticky: 'sticky top-0 z-30 border-b border-white/10 bg-fondo/85 backdrop-blur-xl',
  // barra fija sobre recorridos con scroll propio
  fixed: 'fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-fondo/85 backdrop-blur-xl',
  // sobre escenas a pantalla completa (3D, canvas): se funde con un degradé
  overlay: 'pointer-events-none absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-fondo via-fondo/80 to-transparent pb-8',
}

/**
 * Cabecera común de las secciones: Menú, marca, pestañas opcionales (`children`)
 * y acciones a la derecha (`end`). `wide` la extiende a todo el ancho (escenas).
 */
export function SectionHeader({ variant = 'sticky', wide = false, className = '', children, end, ...brand }) {
  // `className` puede traer su propio z-index (escenas con paneles encima)
  const base = /\bz-/.test(className) ? VARIANTS[variant].replace(/\bz-\d+\b/, '') : VARIANTS[variant]
  const frame = wide ? 'px-4 md:px-8' : 'mx-auto max-w-6xl px-4 md:px-8'
  return (
    <header className={`${base} ${className}`}>
      <div className={`${frame} flex flex-wrap items-center gap-x-4 gap-y-2 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3`}>
        <SiteMenu />
        <SectionBrand {...brand} />
        {children}
        {end ? <div className="pointer-events-auto ml-auto flex items-center gap-3">{end}</div> : null}
      </div>
    </header>
  )
}
