import Image from 'next/image'
import Link from 'next/link'
import { anioCorto } from '@/data/historia'
import { collageLayout } from './collage'
import { Frame } from './Frame'

/** Epígrafe de la foto con el crédito que pide la licencia */
function Credit({ foto }) {
  return (
    <figcaption className="ink-shadow mt-2 ml-auto max-w-[46ch] text-right md:ml-0 md:max-w-[min(46ch,calc(var(--pw)*0.42))] md:text-left font-mono text-[9px] leading-snug tracking-[0.06em] text-claro/65 uppercase">
      {foto.caption}{' '}
      <a
        href={foto.page}
        target="_blank"
        rel="noopener"
        className="underline decoration-white/25 underline-offset-2 hover:text-claro"
      >
        {foto.author} · {foto.license} ↗
      </a>
    </figcaption>
  )
}

/** La camiseta como etiqueta pegada con cinta sobre la foto */
function Sticker({ pieza, layout }) {
  const { corner, rotate, speed } = layout.sticker
  const at = corner === 'top' ? { left: '-5%', top: '-9%' } : { right: '-6%', bottom: '16%' }
  return (
    <div
      data-drift={speed}
      data-spin={-layout.photo.spin}
      className="absolute z-10 w-[clamp(4.5rem,9vw,8.5rem)] will-change-transform"
      style={{ ...at, rotate: `${rotate}deg` }}
    >
      <div className="relative bg-[#ece5d4] p-[7%] shadow-[0_14px_28px_rgba(0,0,0,0.6)]">
        {/* cinta */}
        <span
          aria-hidden="true"
          className="absolute -top-2 left-1/2 z-10 h-4 w-[55%] -translate-x-1/2 -rotate-3 bg-[#f4ecd6]/60 shadow-sm"
        />
        <div className="relative aspect-[33/40]">
          <Image src={pieza.image} alt={`Camiseta ${pieza.year}`} fill loading="eager" decoding="async" sizes="9rem" className="object-contain" />
        </div>
      </div>
    </div>
  )
}

/**
 * Un hito del collage: foto de archivo rasgada (con paralaje propio), la
 * camiseta como etiqueta, y el año gigante + título + bajada a una altura que
 * alterna en zigzag (ver collage.js). Una marca en la línea de tiempo lo ubica.
 */
export function Panel({ pieza, index, total }) {
  const { foto } = pieza
  const layout = collageLayout(index, total, foto ? foto.width / foto.height : undefined)
  const { photo, text } = layout
  // en pantallas angostas (--k chico) el hito se apila sobre la foto en vez de correrse a la derecha
  const textLeft = `calc(var(--pw) * ${text.over} * var(--k) + ${photo.offset}vw)`
  const textPos = text.anchor === 'top' ? { top: `max(${text.at}%, 5.5rem)` } : { bottom: `${text.at}%` }

  return (
    <article
      id={`pieza-${pieza.id}`}
      aria-label={`${pieza.year}: ${pieza.title}`}
      className="relative h-full shrink-0 [--k:1] [--tw:min(23rem,72vw)] max-md:[--k:0.12]"
      style={{
        '--pw': photo.width,
        // el panel termina donde termina su hito (así no tapa el crédito de la foto siguiente)
        width: `calc(max(var(--pw) * ${text.over} * var(--k) + var(--tw), var(--pw) * 0.95) + ${photo.offset}vw)`,
      }}
    >
      {foto ? (
        <figure
          className="absolute z-0 m-0"
          style={{ left: `${photo.offset}vw`, top: `${photo.top}%`, width: 'var(--pw)', rotate: `${photo.rotate}deg` }}
        >
          <div data-drift={photo.speed} data-spin={photo.spin} className="will-change-transform">
            <Frame
              src={foto.src}
              alt={foto.caption}
              clip={photo.clip}
              aspect={photo.aspect}
              color={layout.color}
              parallax
              sizes={`(min-width: 768px) ${Math.round(photo.height * photo.aspect)}vh, 80vw`}
              className="w-full"
            />
            <Credit foto={foto} />
          </div>
          {pieza.image ? <Sticker pieza={pieza} layout={layout} /> : null}
        </figure>
      ) : null}

      {/* el hito */}
      <div className="ink-shadow absolute z-20 w-[var(--tw)]" style={{ left: textLeft, ...textPos }}>
        <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-oro/90 uppercase">
          Pieza {String(pieza.index).padStart(2, '0')} / {String(total).padStart(2, '0')} · {pieza.year}
        </p>
        <p
          aria-hidden="true"
          data-year
          className="-ml-[0.04em] font-serif text-[clamp(4rem,14vh,9.5rem)] leading-[0.85] text-oro italic"
        >
          {anioCorto(pieza.year)}
        </p>
        <h3
          data-panel-title
          className="print-ink mt-1 font-display text-[clamp(1.6rem,4.6vh,3rem)] leading-[0.95] text-oro uppercase [text-wrap:balance]"
        >
          {pieza.title}
        </h3>
        <p data-copy className="mt-3 text-[clamp(10px,1.35vh,12px)] leading-[1.25] font-extrabold tracking-[0.05em] text-claro/90 uppercase">
          {pieza.season}
        </p>
        <p data-copy className="mt-1.5 text-[clamp(10px,1.35vh,12px)] leading-[1.3] font-semibold tracking-[0.03em] text-claro/80 uppercase">
          {pieza.description}
        </p>
        <Link
          data-copy
          href={`/museo#${pieza.id}`}
          className="group mt-3 inline-flex items-center gap-2 border-b border-oro/50 pb-0.5 font-display text-[13px] tracking-[0.08em] text-oro uppercase transition-colors hover:border-oro hover:text-claro"
        >
          Ver en el museo
          <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>

      {/* marca en la línea de tiempo */}
      <span
        aria-hidden="true"
        data-tick
        className="absolute bottom-[7%] z-10 h-4 w-px translate-y-1/2 bg-oro"
        style={{ left: textLeft }}
      />
      <span
        aria-hidden="true"
        className="absolute bottom-[calc(7%-1.6rem)] z-10 font-mono text-[9px] tracking-[0.18em] text-oro/70"
        style={{ left: textLeft }}
      >
        {anioCorto(pieza.year)}
      </span>
    </article>
  )
}
