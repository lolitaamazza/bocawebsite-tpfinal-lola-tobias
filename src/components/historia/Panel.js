import Link from 'next/link'
import { anioCorto } from '@/data/historia'
import { Frame } from './Frame'

/** Epígrafe de la foto con el crédito que pide la licencia */
function Credit({ foto }) {
  return (
    <p className="mt-2 max-w-[44ch] font-mono text-[9px] leading-snug tracking-[0.08em] text-claro/45 uppercase">
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
  )
}

/** Bloque de texto: rótulo, título gigante, bajada en serif itálica, descripción y botón */
function Copy({ pieza, total }) {
  return (
    <div className="flex w-[min(30rem,82vw)] shrink-0 flex-col justify-center md:w-[30vw]">
      <p className="eyebrow text-oro">
        Pieza {String(pieza.index).padStart(2, '0')} / {String(total).padStart(2, '0')} · {pieza.year}
      </p>
      <h3
        data-panel-title
        className="mt-3 font-display text-[clamp(2.8rem,6.2vw,6.5rem)] leading-[0.88] uppercase [text-wrap:balance]"
      >
        {pieza.title}
      </h3>
      <p data-panel-title className="mt-3 font-serif text-[clamp(1.2rem,1.7vw,1.7rem)] text-claro/80 italic">
        {pieza.season}
      </p>
      <p className="mt-5 max-w-[42ch] text-[13px] leading-relaxed text-claro/65 md:text-sm">{pieza.description}</p>
      <div className="mt-6 flex items-center gap-4">
        <span className="font-display text-2xl text-oro">{anioCorto(pieza.year)}</span>
        <Link
          href={`/museo#${pieza.id}`}
          className="eyebrow group inline-flex h-9 items-center gap-2 border border-white/30 px-4 text-[10px] text-claro/85 transition-colors hover:border-oro hover:text-oro"
        >
          Ver en el museo
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </div>
  )
}

/**
 * Un panel del recorrido horizontal. Tres disposiciones que se alternan, como en
 * la referencia: texto + foto grande, foto grande + texto, y dos fotos chicas
 * apiladas (camiseta y detalle) + foto grande + texto.
 */
export function Panel({ pieza, total, variant }) {
  const { foto } = pieza
  const big = foto ? (
    <div className="shrink-0">
      <Frame
        src={foto.src}
        alt={foto.caption}
        parallax
        className="h-[min(68vh,40rem)] w-[min(86vw,46rem)] md:w-[40vw]"
        sizes="(min-width: 768px) 40vw, 86vw"
      />
      <Credit foto={foto} />
    </div>
  ) : null
  const jersey = pieza.image ? (
    <Frame
      src={pieza.image}
      alt={`Camiseta ${pieza.year}`}
      contain
      className="h-[min(32vh,19rem)] w-[min(60vw,15rem)] md:w-[15vw]"
      sizes="20vw"
    />
  ) : null

  return (
    <article
      id={`pieza-${pieza.id}`}
      className="relative flex h-full shrink-0 items-center gap-[clamp(1.5rem,4vw,5rem)] px-[clamp(1.5rem,5vw,6rem)]"
      aria-label={`${pieza.year}: ${pieza.title}`}
    >
      {/* año gigante de fondo */}
      <span
        aria-hidden="true"
        data-ghost
        className="pointer-events-none absolute top-1/2 left-[8%] -translate-y-1/2 font-display text-[34vh] leading-none text-white/[0.035] select-none"
      >
        {anioCorto(pieza.year)}
      </span>

      {variant === 0 ? (
        <>
          <Copy pieza={pieza} total={total} />
          {big}
        </>
      ) : variant === 1 ? (
        <>
          {big}
          <Copy pieza={pieza} total={total} />
        </>
      ) : (
        <>
          <div className="flex shrink-0 flex-col gap-4">
            {jersey}
            {foto ? (
              <Frame
                src={foto.src}
                alt=""
                zoom={1.7}
                className="h-[min(30vh,18rem)] w-[min(60vw,15rem)] md:w-[15vw]"
                sizes="20vw"
              />
            ) : null}
          </div>
          {big}
          <Copy pieza={pieza} total={total} />
        </>
      )}

      {/* en las disposiciones sin columna de detalle, la camiseta acompaña flotando */}
      {variant !== 2 && jersey ? <div className="hidden shrink-0 self-end pb-[10vh] xl:block">{jersey}</div> : null}
    </article>
  )
}
