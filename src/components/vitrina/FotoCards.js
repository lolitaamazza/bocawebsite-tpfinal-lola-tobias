import Image from 'next/image'

/**
 * Respaldo de la Vitrina sin WebGL2 (o si el contexto se pierde): las tarjetas
 * con foto de siempre, alternadas en una cuadrícula de 6 columnas y con
 * paralaje (la Historia anima [data-speed], [data-vparallax] y [data-count]).
 */
const LAYOUT = [
  { col: 'md:col-start-1', speed: 0.6 },
  { col: 'md:col-start-5 md:mt-[28vh]', speed: 1.2 },
  { col: 'md:col-start-3 md:-mt-[6vh]', speed: 0.9 },
  { col: 'md:col-start-1 md:-mt-[10vh]', speed: 1.3 },
  { col: 'md:col-start-5 md:mt-[12vh]', speed: 0.7 },
  { col: 'md:col-start-3 md:-mt-[4vh]', speed: 1.1 },
]

function Card({ logro, layout }) {
  const { foto } = logro
  return (
    <article data-speed={layout.speed} className={`relative md:col-span-2 ${layout.col}`}>
      {foto ? (
        <figure className="relative aspect-[16/11] overflow-hidden bg-noche">
          <div data-vparallax className="absolute inset-x-0 -inset-y-[14%] will-change-transform">
            <Image src={foto.src} alt={foto.caption} fill loading="eager" decoding="async" sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
          </div>
        </figure>
      ) : null}
      <div className="bg-oro px-[clamp(1.25rem,2.4vw,2.5rem)] pt-[clamp(1.25rem,2.4vw,2.25rem)] pb-[clamp(1.5rem,2.8vw,2.75rem)] text-fondo">
        <p className="flex items-baseline gap-3">
          <span data-count={logro.count} className="font-display text-[clamp(3.5rem,6vw,6rem)] leading-none tabular-nums">
            {logro.count}
          </span>
          <span className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase opacity-70">
            {logro.range ? `${logro.years[0]} — ${logro.years[1]}` : logro.years.join(' · ')}
          </span>
        </p>
        <h3 className="mt-3 text-[clamp(1.6rem,2.5vw,2.5rem)] leading-[1.02] font-extrabold tracking-tight">{logro.title}</h3>
        <p className="mt-4 max-w-[40ch] text-[14px] leading-relaxed opacity-85">{logro.text}</p>
      </div>
      {foto ? (
        <p className="mt-2 font-mono text-[9px] leading-snug tracking-[0.08em] text-claro/40 uppercase">
          {foto.caption}{' '}
          <a
            href={foto.page}
            target="_blank"
            rel="noopener"
            className="underline decoration-white/20 underline-offset-2 hover:text-claro"
          >
            {foto.author} · {foto.license} ↗
          </a>
        </p>
      ) : null}
    </article>
  )
}

export function FotoCards({ logros }) {
  return (
    <div className="px-[clamp(1.25rem,4vw,3rem)]">
      <div className="relative mx-auto mt-[12vh] grid max-w-[1500px] grid-cols-1 gap-y-16 md:grid-cols-6 md:gap-x-[clamp(1.5rem,3vw,3rem)] md:gap-y-[10vh]">
        {logros.map((l, i) => (
          <Card key={l.id} logro={l} layout={LAYOUT[i % LAYOUT.length]} />
        ))}
      </div>
    </div>
  )
}
