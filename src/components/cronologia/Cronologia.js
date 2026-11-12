'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { camisetaIndex, camisetas } from '@/data/cronologia'

const ShirtScene = dynamic(() => import('./ShirtScene'), { ssr: false })
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oro'

export function Cronologia() {
  const [index, setIndex] = useState(0)
  const [back, setBack] = useState(false)
  const [ready, setReady] = useState(false)
  const item = camisetas[index]

  useEffect(() => {
    const sync = () => {
      setIndex(camisetaIndex(window.location.hash))
      setBack(false)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  function select(next) {
    if (next === index) return
    window.history.pushState(null, '', `#camiseta-${camisetas[next].id}`)
    setIndex(next)
    setBack(false)
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[100rem] px-4 pb-12 sm:px-8 xl:px-16">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-white/15 font-mono text-xs uppercase">
        <Link href="/" className={`${focus} py-3 hover:text-oro`}>← Vestuario</Link>
        <Link href="/museo" className={`${focus} py-3 hover:text-oro`}>Museo de camisetas ↗</Link>
      </header>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 md:mt-12">
        <h1 className="font-display text-[clamp(2.7rem,6vw,6.1rem)] leading-[0.99] uppercase">
          Cronología de <span className="text-oro">camisetas</span>
        </h1>
        <p className="pb-1 font-mono text-xs tracking-wider text-claro/65">BOCA JUNIORS / 1905–2025</p>
      </div>

      <nav aria-label="Línea de tiempo de camisetas" className="mt-6 md:mt-8">
        <ol className="grid grid-cols-5 gap-y-2 md:grid-cols-10">
          {camisetas.map((camiseta, i) => (
            <li key={camiseta.id} className="min-w-0 border-t border-oro/30">
              <button
                type="button"
                aria-current={i === index ? 'true' : undefined}
                aria-controls="camiseta-seleccionada"
                aria-label={`${camiseta.year}, ${camiseta.title}`}
                onClick={() => select(i)}
                className={`${focus} group relative flex min-h-12 w-full flex-col items-center justify-center font-mono text-[clamp(0.67rem,1.1vw,0.9rem)] tabular-nums hover:text-oro ${i === index ? 'bg-oro/10 text-oro' : 'text-claro/70'}`}
              >
                <span aria-hidden="true" className={`absolute -top-1 size-2 rounded-full border border-oro ${i === index ? 'bg-oro' : 'bg-fondo group-hover:bg-oro'}`} />
                {camiseta.year}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section id="camiseta-seleccionada" aria-label="Camiseta seleccionada" className="mt-5 grid overflow-hidden border border-white/15 bg-[#09142a] md:grid-cols-[minmax(0,1.6fr)_minmax(17rem,1fr)]">
        <figure className="relative isolate h-[clamp(18rem,46vw,33rem)] overflow-hidden border-b border-white/15 bg-[radial-gradient(ellipse_at_50%_50%,#294578_0%,#0d1e3b_52%,#081124_82%)] md:border-r md:border-b-0">
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-display text-[clamp(5.5rem,16vw,18rem)] leading-none text-white/[0.055]">{item.id}</span>
          {!ready && (
            <Image src={item.image} alt={`Camiseta de Boca Juniors de ${item.year}`} fill sizes="(min-width: 768px) 60vw, 100vw" className="object-contain p-8 pb-14" />
          )}
          <ShirtScene diseño={item.diseño} back={back} onReady={setReady} />
          <figcaption className="absolute inset-x-4 bottom-3 flex min-h-10 items-center justify-between gap-3 text-xs text-claro/75 sm:inset-x-6">
            {ready ? 'Recreación 3D' : 'Foto de archivo'}
            {ready && (
              <button type="button" onClick={() => setBack(!back)} className={`${focus} min-h-11 rounded-full border border-oro/50 bg-fondo px-4 font-mono text-oro hover:border-oro`}>
                {back ? '↻ Ver frente' : '↻ Ver espalda'}
              </button>
            )}
          </figcaption>
        </figure>

        <div className="flex flex-col justify-between p-5 sm:p-8 xl:p-12">
          <div aria-live="polite" aria-atomic="true">
            <p className="font-mono text-xs tracking-wider text-oro uppercase">{item.year} / {item.season}</p>
            <h2 className="mt-4 font-display text-[clamp(2.4rem,4vw,4.9rem)] leading-[1.02] uppercase">{item.title}</h2>
            <p className="mt-4 max-w-[40ch] text-base leading-relaxed text-claro/80 sm:text-lg">{item.description}</p>
            <a href={item.imageSource} target="_blank" rel="noreferrer" className={`${focus} mt-5 inline-flex min-h-11 items-center text-sm text-oro underline underline-offset-4`}>
              Fuente del club ↗
            </a>
          </div>

          <div className="mt-6 flex items-center justify-between gap-2 border-t border-white/15 pt-4 font-mono text-xs">
            <button type="button" onClick={() => select(index - 1)} disabled={index === 0} className={`${focus} min-h-11 text-oro disabled:text-claro/35`}>← Anterior</button>
            <span className="tabular-nums text-claro/65">{index + 1} / {camisetas.length}</span>
            <button type="button" onClick={() => select(index + 1)} disabled={index === camisetas.length - 1} className={`${focus} min-h-11 text-oro disabled:text-claro/35`}>Siguiente →</button>
          </div>
        </div>
      </section>
    </main>
  )
}
