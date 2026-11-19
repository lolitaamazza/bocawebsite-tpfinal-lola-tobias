import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Retrato } from '@/components/idolos/Retrato'
import { SectionHeader, headerLinkClass } from '@/components/layout/SectionHeader'
import { idoloBySlug, idolos } from '@/data/idolos'
import { apellido, formatEtapas, numero, temporadas, vecinos } from '@/engine/idolos'

/** Una ficha por ídolo, generada en el build */
export function generateStaticParams() {
  return idolos.map((i) => ({ slug: i.slug }))
}

// Sin dynamicParams = false: así un slug desconocido llega a notFound() y muestra
// el 404 propio del salón (idolos/not-found.js) en vez del global.

async function idoloFrom(params) {
  const { slug } = await params
  return idoloBySlug(slug)
}

export async function generateMetadata({ params }) {
  const i = await idoloFrom(params)
  if (!i) return { title: 'Ídolo no encontrado', robots: { index: false } }
  const title = i.apodo ? `${i.nombre}, «${i.apodo}»` : i.nombre
  const description = `${i.rol} de Boca Juniors (${formatEtapas(i.etapas)}). ${i.frase}`
  const images = i.foto
    ? [{ url: i.foto.src, width: i.foto.width, height: i.foto.height, alt: i.foto.caption }]
    : [{ url: '/og/vestuario.jpg', width: 1200, height: 630 }]
  return {
    title,
    description,
    alternates: { canonical: `/idolos/${i.slug}` },
    openGraph: { type: 'profile', title: `${title} · Salón de ídolos`, description, images },
  }
}

/** Ficha de un ídolo: la misma información del salón, en una página propia y sin animación. */
export default async function IdoloPage({ params }) {
  const i = await idoloFrom(params)
  if (!i) notFound()
  const { prev, next } = vecinos(idolos, i.slug)
  return (
    <div className="paper-grunge min-h-dvh text-claro">
      <SectionHeader
        title="Salón de"
        accent="ídolos"
        end={
          <Link href={`/idolos#${i.slug}`} className={headerLinkClass}>
            ← Salón de ídolos
          </Link>
        }
      />

      <main className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:px-8 md:py-20">
        <Retrato idolo={i} priority sizes="(min-width: 768px) 45vw, 90vw" className="md:justify-self-end" />

        <article className="max-w-[40rem]">
          <p className="eyebrow text-oro/90">
            Ídolo {numero(i.numero)} / {numero(idolos.length)} · {i.rol}
          </p>
          <h1 className="print-ink mt-1 pt-[0.14em] font-display text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.88] uppercase [text-wrap:balance]">
            {i.nombre}
          </h1>
          {i.apodo ? (
            <p className="mt-2 font-serif text-[clamp(1.6rem,3vw,2.6rem)] leading-none text-oro italic">«{i.apodo}»</p>
          ) : null}
          <p className="mt-4 font-mono text-[11px] tracking-[0.14em] text-claro/70 uppercase tabular-nums">
            En Boca {formatEtapas(i.etapas)}
            <span className="text-claro/40"> · {temporadas(i.etapas)} temporadas</span>
          </p>
          <p className="mt-6 text-[clamp(1.05rem,1.5vw,1.35rem)] leading-snug text-claro/90">{i.frase}</p>
          <ol className="mt-6 border-t border-claro/15">
            {i.datos.map((dato, d) => (
              <li
                key={d}
                className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-2 border-b border-claro/15 py-3 text-[15px] leading-snug text-claro/80"
              >
                <span className="pt-0.5 font-mono text-[10px] tracking-[0.1em] text-oro tabular-nums">{numero(d + 1)}</span>
                {dato}
              </li>
            ))}
          </ol>
          <h2 className="eyebrow mt-6 text-claro/50">Fuentes</h2>
          <ul className="mt-2 space-y-1">
            {i.fuentes.map((f) => (
              <li key={f.url}>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener"
                  className="font-mono text-[11px] tracking-[0.08em] text-claro/70 underline decoration-claro/25 underline-offset-2 hover:text-oro"
                >
                  {f.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </article>
      </main>

      <nav
        aria-label="Otros ídolos"
        className="mx-auto flex max-w-6xl justify-between gap-4 border-t border-claro/15 px-4 py-8 font-mono text-[11px] tracking-[0.14em] uppercase md:px-8"
      >
        {prev ? (
          <Link href={`/idolos/${prev.slug}`} rel="prev" className="hover:text-oro">
            ← {numero(prev.numero)} {apellido(prev.nombre)}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/idolos/${next.slug}`} rel="next" className="text-right hover:text-oro">
            {numero(next.numero)} {apellido(next.nombre)} →
          </Link>
        ) : (
          <Link href="/idolos" className="text-right hover:text-oro">
            Volver al salón →
          </Link>
        )}
      </nav>
    </div>
  )
}
