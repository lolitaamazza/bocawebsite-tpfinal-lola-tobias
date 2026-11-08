import { site } from '../../config/site'
import { Icon } from '../ui/Icon'
import { Ticker } from './Ticker'
/** Pie: aviso de tributo, crédito, ayuda de uso, personalizador, sonido y la cinta corrida. */
export function Footer({ hint, hintVisible, sound, onSound, onCustomize }) {
  const ticker = site.ticker.map((t) => t.replace('{season}', site.season))
  return (
    <footer data-reveal className="pointer-events-none absolute inset-x-0 bottom-0 z-20 opacity-0">
      <div className="flex items-end justify-between gap-4 px-4 pb-3 md:px-8 md:pb-4">
        <div className="hidden text-[11px] leading-relaxed text-claro/55 md:block">
          <p>© {site.season} · Tributo no oficial de un hincha</p>
          <a href={site.credits.href} target="_blank" rel="noopener" className="pointer-events-auto group inline-flex gap-1">
            <span>{site.credits.label}:</span>
            <span className="relative text-claro/80">
              {site.credits.name}
              <span className="absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-oro transition-transform duration-500 ease-telon group-hover:scale-x-100" />
            </span>
          </a>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <p
            className={`eyebrow hidden text-claro/50 transition-opacity duration-500 sm:block ${hintVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            {hint}
          </p>
          <button
            type="button"
            onClick={onCustomize}
            className="pointer-events-auto hidden h-9 items-center gap-2 rounded-full bg-oro px-4 font-mono text-[11px] font-semibold tracking-[0.16em] text-fondo uppercase shadow-lg shadow-black/40 transition-[filter,transform] hover:brightness-110 active:scale-[0.98] md:flex"
          >
            <Icon name="pencil" className="h-3.5 w-3.5" />
            Personalizá la tuya
          </button>
          <button
            type="button"
            onClick={onSound}
            aria-pressed={sound}
            aria-label={sound ? 'Silenciar sonido ambiente' : 'Activar sonido ambiente'}
            className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full border border-white/15 text-claro/70 transition-colors hover:border-white/50 hover:text-claro aria-pressed:text-oro"
          >
            <Icon name={sound ? 'soundOn' : 'soundOff'} />
          </button>
        </div>
      </div>
      <Ticker items={ticker} />
    </footer>
  )
}
