import Image from 'next/image'
import { iniciales } from '@/engine/idolos'

/** Crédito que pide la licencia: epígrafe + autor · licencia ↗ (link a la ficha de Commons) */
export function Credito({ foto, className = '' }) {
  return (
    <figcaption
      className={`mt-2 max-w-[52ch] font-mono text-[9px] leading-snug tracking-[0.06em] text-claro/60 uppercase ${className}`}
    >
      {foto.caption}{' '}
      <a
        href={foto.page}
        target="_blank"
        rel="noopener"
        className="underline decoration-claro/25 underline-offset-2 transition-colors hover:text-oro"
      >
        {foto.author} · {foto.license} ↗
      </a>
    </figcaption>
  )
}

/**
 * Retrato del ídolo. Con foto: impresa en blanco y negro con semitono
 * (print-photo), que se revela a color cuando el capítulo está activo
 * (`data-color` lo pone el Salón). La foto nunca se estira a más de 1,5× su
 * tamaño real: las de los años 30 son chicas y se verían lavadas.
 * Sin foto libre: tarjeta tipográfica con las iniciales, nunca una foto falsa.
 */
export function Retrato({ idolo, priority = false, sizes = '(min-width: 1024px) 40vw, 90vw', className = '' }) {
  const { foto } = idolo
  if (!foto) {
    return (
      <figure className={`m-0 ${className}`}>
        <div
          role="img"
          aria-label={`${idolo.nombre}: sin foto con licencia libre`}
          className="paper-grunge relative grid aspect-[3/4] h-[min(70vh,34rem)] max-w-full place-items-center overflow-hidden border border-oro/40"
        >
          <span aria-hidden="true" className="print-ink font-display text-[clamp(7rem,22vh,12rem)] leading-none text-oro">
            {iniciales(idolo.nombre)}
          </span>
          <span aria-hidden="true" className="eyebrow absolute bottom-4 text-claro/50">
            Sin foto libre
          </span>
        </div>
      </figure>
    )
  }
  return (
    <figure className={`m-0 ${className}`}>
      <div
        data-retrato
        className="print-photo relative h-[min(72vh,var(--alto))] w-auto max-w-full overflow-hidden max-md:h-auto max-md:w-full max-md:max-w-[min(100%,var(--ancho))] bg-noche shadow-[0_24px_60px_rgba(0,0,0,0.55)] [&_img]:transition-[filter] [&_img]:duration-1000"
        style={{ aspectRatio: `${foto.width} / ${foto.height}`, '--alto': `${Math.round(foto.height * 1.5)}px`,
          '--ancho': `${Math.round(foto.width * 1.5)}px`,
        }}
      >
        <div data-parallax className="absolute -inset-y-[8%] inset-x-0 will-change-transform">
          <Image
            src={foto.src}
            alt={foto.caption}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover object-top"
          />
        </div>
      </div>
      <Credito foto={foto} />
    </figure>
  )
}
