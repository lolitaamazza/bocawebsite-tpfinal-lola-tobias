import type { ReactNode } from 'react'
import { site } from '../../config/site'
import { Icon } from '../ui/Icon'

interface Props {
  /** Buscador (lupa + panel) */
  search: ReactNode
  /** Filtros por línea */
  filters: ReactNode
  hideFiltersOnMobile: boolean
  onCustomize: () => void
}

/**
 * Cabecera: escudo, marca y temporada; a la derecha buscador y filtros.
 * Fondo opaco que se desvanece para que la escena no le quite contraste.
 * Móvil: escudo + título + lupa en una fila; filtros deslizables en otra.
 */
export function Header({ search, filters, hideFiltersOnMobile, onCustomize }: Props) {
  return (
    <header
      data-reveal
      className="pointer-events-none absolute inset-x-0 top-0 z-[35] grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2.5 bg-gradient-to-b from-fondo from-[74%] to-transparent px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-8 opacity-0 md:grid-cols-[1fr_auto_1fr] md:items-start md:px-8 md:pt-6 md:pb-9"
    >
      <div className="flex items-center gap-2.5">
        <img src={site.crest.src} alt={site.crest.alt} width={842} height={1000} className="h-10 w-auto drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] md:h-11" />
        <div className="hidden leading-none md:block">
          <p className="font-display text-[15px] tracking-wide uppercase">Vestuario</p>
          <p className="mt-1 font-mono text-[9px] tracking-[0.22em] text-claro/60 uppercase">{site.stadium}</p>
        </div>
      </div>

      <div className="min-w-0 md:text-center">
        <h1 className="font-display text-[1.55rem] leading-none tracking-[0.02em] uppercase min-[400px]:text-[1.8rem] md:text-[2.6rem]">
          Boca <span className="text-oro">Juniors</span>
        </h1>
        <p className="eyebrow mt-1.5 truncate text-[9px] tracking-[0.2em] text-oro md:mt-2 md:text-[10px] md:tracking-[0.3em]">
          Plantel {site.season}
          <span className="hidden min-[400px]:inline"> · {site.competition}</span>
        </p>
      </div>

      <nav className="contents md:flex md:flex-wrap md:items-center md:justify-end md:gap-1.5" aria-label="Buscar y filtrar el plantel">
        <div className="pointer-events-auto flex items-center gap-2 md:relative">
          <button
            type="button"
            onClick={onCustomize}
            className="pointer-events-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-oro text-fondo shadow-lg shadow-black/40 transition-[filter,transform] hover:brightness-110 active:scale-[0.98] md:hidden"
            aria-label="Personalizá la tuya"
            title="Personalizá la tuya"
          >
            <Icon name="pencil" />
          </button>
          {search}
        </div>
        <div
          className={`pointer-events-auto scrollbar-none col-span-3 -mx-4 flex gap-2 overflow-x-auto px-4 md:col-span-1 md:mx-0 md:flex-wrap md:justify-end md:gap-1.5 md:overflow-visible md:px-0 ${hideFiltersOnMobile ? 'max-md:portrait:hidden' : ''}`}
        >
          {filters}
        </div>
      </nav>
    </header>
  )
}
