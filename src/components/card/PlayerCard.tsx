import { positionLabel } from '../../config/site'
import { portraitUrl, stats as statsFile } from '../../data'
import type { Player, PlayerStats } from '../../types'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'
import { StatTile } from '../ui/StatTile'

interface Props {
  player: Player
  stats?: PlayerStats
  more: boolean
  onMore: () => void
  onCustomize: () => void
  onShare: () => void
  onPrev: () => void
  onNext: () => void
}

const fetched = new Date(`${statsFile.meta.fetched}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })

/** Ficha: retrato, dorsal, nombre, números del torneo y, ampliada, los datos del jugador */
export function PlayerCard({ player: p, stats: s, more, onMore, onCustomize, onShare, onPrev, onNext }: Props) {
  const keeper = p.pos === 'ARQ'
  const rows: [string, string][] = [
    ['Posición', p.capitan ? `${p.rol} · Capitán` : p.rol],
    ['Edad', `${p.edad} años`],
    ['Nacionalidad', p.pais],
    ['Procedencia', p.procedencia],
    ['Contrato', p.contrato ? `Hasta ${p.contrato}` : '—'],
  ]
  return (
    <div>
      <p data-card-item className="eyebrow hidden text-claro/55 landscape:block">
        Ficha
        <span className="ml-2 rounded-full border border-oro/60 px-2 py-0.5 text-oro">{positionLabel(p.pos)}</span>
      </p>

      <div data-card-item className="relative flex items-center gap-3.5 pr-12 landscape:mt-4 landscape:gap-4 landscape:pr-0">
        <img
          src={portraitUrl(p)}
          alt={`${p.nombre} ${p.apellido}`}
          width={300}
          height={390}
          className="h-[4.6rem] w-[3.6rem] shrink-0 rounded-xl bg-white/[0.06] object-cover object-top landscape:order-last landscape:ml-auto landscape:h-[7.5rem] landscape:w-24"
        />
        <span className="font-display text-5xl leading-none text-claro landscape:text-7xl">{p.dorsal}</span>
        <div className="min-w-0">
          <p className="truncate text-base leading-tight text-claro/80 landscape:text-lg">
            <span className="mr-1.5">{p.bandera}</span>
            {p.nombre}
          </p>
          <p className="truncate text-2xl leading-tight font-extrabold tracking-tight landscape:text-3xl">{p.apellido}</p>
          {p.capitan ? <p className="eyebrow mt-1 text-oro">Capitán</p> : null}
        </div>
      </div>

      <div data-card-item className="mt-3 grid grid-cols-4 gap-1.5 landscape:mt-4">
        <StatTile value={s ? s.pj : '–'} extra={s ? `${s.tit} tit.` : undefined} label="Partidos" />
        <StatTile value={s ? `${s.min}′` : '–'} label="Minutos" />
        {keeper ? (
          <StatTile value={s ? s.conv : '–'} label="Convocado" />
        ) : (
          <StatTile value={s ? s.goles : '–'} extra={s ? `${s.asist} asist.` : undefined} label="Goles" />
        )}
        <StatTile
          value={
            <>
              <span className="h-3.5 w-2.5 rounded-[2px] bg-yellow-400" />
              {s ? s.ta : '–'}
              <span className="ml-1 h-3.5 w-2.5 rounded-[2px] bg-red-600" />
              {s ? s.tr : '–'}
            </>
          }
          label="Tarjetas"
        />
      </div>
      <p data-card-item className="mt-1.5 font-mono text-[8px] tracking-[0.18em] text-claro/40 uppercase">
        {statsFile.meta.competition} · {statsFile.meta.source} · {fetched}
      </p>

      <button
        type="button"
        data-card-item
        onClick={onMore}
        aria-expanded={more}
        className="eyebrow mt-3 flex w-full items-center justify-between border-t border-white/10 pt-3 text-claro/60 hover:text-claro landscape:hidden"
      >
        {more ? 'Menos datos' : 'Más datos'}
        <Icon name="more" className={`h-3.5 w-3.5 transition-transform duration-300 ${more ? 'rotate-180' : ''}`} />
      </button>

      <dl data-card-item className={`mt-3 divide-y divide-white/10 border-y border-white/10 landscape:mt-5 landscape:block ${more ? 'block' : 'hidden'}`}>
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 py-2">
            <dt className="eyebrow text-claro/45">{k}</dt>
            <dd className="truncate text-right font-mono text-[11px] tracking-[0.1em] uppercase">{v}</dd>
          </div>
        ))}
      </dl>

      <div data-card-item className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onCustomize}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-oro font-mono text-[11px] font-semibold tracking-[0.16em] text-fondo uppercase shadow-lg shadow-black/40 transition-[filter,transform] hover:brightness-110 active:scale-[0.98] landscape:h-9"
        >
          <Icon name="pencil" className="h-3.5 w-3.5" />
          Con mi nombre
        </button>
        <IconButton icon="share" label="Compartir ficha" onClick={onShare} />
        <IconButton icon="prev" label="Jugador anterior" onClick={onPrev} />
        <IconButton icon="next" label="Jugador siguiente" onClick={onNext} />
      </div>
    </div>
  )
}
