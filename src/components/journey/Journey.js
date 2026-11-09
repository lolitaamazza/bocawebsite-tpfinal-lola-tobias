'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { site } from '@/config/site'
import { journey, journeyYears } from '@/data/journey'
import { hitoIndexForYear, rollOffsets } from '@/engine/journey'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const conHito = new Set(journey.map((h) => h.year))

/**
 * Journey 2000–2026, al estilo de davidalaba.com/journey: el año gigante queda
 * fijo en el centro y se invierte sobre las fotos (mix-blend-difference); al
 * cambiar de hito sus cifras ruedan como un contador. A la izquierda, todos los
 * años (clickeables); a la derecha, mes y texto, que se encienden al llegar.
 */
export function Journey() {
  const root = useRef(null)
  const digitRefs = useRef([])
  const entries = useRef([])
  const lenis = useRef(null)
  const [active, setActive] = useState(0)

  // Scroll suave de toda la página
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const l = new Lenis({ lerp: reduced ? 1 : 0.09 })
    l.on('scroll', ScrollTrigger.update)
    const raf = (t) => l.raf(t * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    lenis.current = l
    return () => {
      gsap.ticker.remove(raf)
      l.destroy()
    }
  }, [])

  // Cada hito: activa su año al cruzar el centro, enciende su texto y acerca su foto
  useGSAP(
    () => {
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
      entries.current.forEach((el, i) => {
        if (!el) return
        ScrollTrigger.create({
          trigger: el,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => self.isActive && setActive(i),
        })
        const text = el.querySelector('[data-text]')
        gsap.fromTo(
          text,
          { opacity: 0.15, y: 24 },
          { opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top 75%', end: 'top 35%', scrub: true } },
        )
        gsap.to(text, {
          opacity: 0.15,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'bottom 70%', end: 'bottom 35%', scrub: true },
        })
        if (!reduced) {
          const img = el.querySelector('[data-img]')
          gsap.fromTo(
            img,
            { scale: 1.18, yPercent: -6 },
            {
              scale: 1,
              yPercent: 6,
              ease: 'none',
              scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
            },
          )
        }
      })
      gsap.from('[data-hero-line]', { yPercent: 110, duration: 1.1, stagger: 0.08, ease: 'power4.out', delay: 0.15 })
    },
    { scope: root },
  )

  // El año rueda cifra por cifra hasta el del hito activo
  useEffect(() => {
    const offsets = rollOffsets(journey[active].year)
    digitRefs.current.forEach((col, i) => {
      if (col) gsap.to(col, { yPercent: offsets[i], duration: 0.9, ease: 'expo.out', delay: i * 0.05, overwrite: true })
    })
  }, [active])

  const goTo = (year) => {
    const el = entries.current[hitoIndexForYear(journey, year)]
    if (el) lenis.current?.scrollTo(el, { offset: -window.innerHeight * 0.12, duration: 1.6 })
  }

  const activeYear = journey[active].year

  return (
    <div ref={root} className="relative min-h-dvh bg-claro text-fondo">
      {/* cabecera fina con línea, como la referencia */}
      <header className="fixed inset-x-0 top-0 z-40 bg-claro/90 backdrop-blur">
        <nav
          className="flex items-center justify-between gap-4 border-b border-fondo/70 px-3 py-2 font-mono text-[10px] tracking-[0.14em] uppercase md:px-4"
          aria-label="Secciones"
        >
          <Link href="/" className="hover:text-azul">
            Vestuario
          </Link>
          <Link href="/museo" className="hidden hover:text-azul sm:inline">
            Museo
          </Link>
          <Link href="/" aria-label="Volver al vestuario" className="flex items-center gap-2">
            <Image unoptimized src={site.crest.src} alt="" width={842} height={1000} className="h-6 w-auto" />
          </Link>
          <span aria-current="page" className="text-azul">
            Journey
          </span>
          <Link href="/mis-remeras" className="hidden hover:text-azul sm:inline">
            Mis remeras
          </Link>
        </nav>
      </header>

      {/* columna de años */}
      <nav aria-label="Años" className="fixed top-14 bottom-6 left-3 z-30 hidden flex-col justify-between md:flex">
        {journeyYears.map((y) => {
          const has = conHito.has(y)
          const isActive = y === activeYear
          return (
            <button
              key={y}
              type="button"
              onClick={() => goTo(y)}
              aria-current={isActive ? 'true' : undefined}
              className={`flex items-center gap-1.5 text-left font-mono text-[10px] tabular-nums transition-colors duration-300 ${
                isActive ? 'text-fondo' : has ? 'text-fondo/40 hover:text-fondo' : 'text-fondo/15 hover:text-fondo/50'
              }`}
            >
              <span className={`h-1.5 w-1.5 bg-fondo transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} />
              {y}
            </button>
          )
        })}
      </nav>

      {/* año gigante fijo: se invierte sobre las fotos */}
      <div
        aria-live="polite"
        aria-label={`Año ${activeYear}`}
        className="pointer-events-none fixed inset-x-0 top-[16vh] z-20 -translate-y-1/2 md:top-1/2 text-center font-sans text-[clamp(5rem,15vw,15rem)] leading-none font-light tracking-[-0.04em] text-white mix-blend-difference"
      >
        {[0, 1, 2, 3].map((i) => (
          // Rodillo de una cifra: columna 0–9 que se desliza hasta la cifra pedida
          <span key={i} className="relative inline-block h-[1em] overflow-hidden align-top">
            <span ref={(el) => void (digitRefs.current[i] = el)} className="flex flex-col will-change-transform">
              {Array.from({ length: 10 }, (_, d) => (
                <span key={d} className="block h-[1em] leading-none">
                  {d}
                </span>
              ))}
            </span>
          </span>
        ))}
      </div>

      {/* apertura */}
      <section className="relative flex min-h-dvh flex-col items-center justify-end px-6 pb-[12vh] text-center">
        <p className="overflow-hidden font-mono text-[11px] tracking-[0.3em] uppercase">
          <span data-hero-line className="block">
            Boca Juniors · Journey
          </span>
        </p>
        <p className="mt-3 max-w-[46ch] overflow-hidden text-[15px] leading-relaxed text-fondo/70">
          <span data-hero-line className="block">
            Veintisiete años en azul y oro, del campeón del mundo en Tokio al plantel de hoy. Bajá despacio.
          </span>
        </p>
        <span className="animate-nudge mt-6 inline-block text-lg" aria-hidden="true">
          ↓
        </span>
      </section>

      {/* hitos */}
      <ol className="relative">
        {journey.map((h, i) => (
          <li
            key={h.year}
            id={`y${h.year}`}
            ref={(el) => void (entries.current[i] = el)}
            className="relative grid min-h-[125vh] grid-cols-1 px-4 py-[10vh] md:grid-cols-[18vw_minmax(0,1fr)_24vw] md:px-0"
            aria-label={`${h.year}, ${h.month}`}
          >
            <span className="hidden md:block" />
            <figure className="relative h-[92vh] overflow-hidden bg-fondo/10">
              {h.foto ? (
                <>
                  <div data-img className="absolute inset-0 will-change-transform">
                    <Image
                      src={h.foto.src}
                      alt={h.foto.caption}
                      fill
                      sizes="(min-width: 768px) 58vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/60 to-transparent px-3 pt-8 pb-2 font-mono text-[9px] tracking-[0.08em] text-white/80 uppercase">
                    {h.foto.caption}{' '}
                    <a
                      href={h.foto.page}
                      target="_blank"
                      rel="noopener"
                      className="underline decoration-white/30 underline-offset-2"
                    >
                      {h.foto.author} · {h.foto.license} ↗
                    </a>
                  </figcaption>
                </>
              ) : null}
            </figure>
            <div className="relative md:pl-4">
              <div data-text className="sticky top-[46vh] mt-6 max-w-[34ch] md:mt-0 md:pr-4">
                <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase">
                  <span className="h-1.5 w-1.5 bg-fondo" />
                  {h.month} · {h.year}
                </p>
                <p className="mt-2 text-[clamp(1rem,1.35vw,1.3rem)] leading-snug">{h.text}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {/* cierre */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="font-mono text-[11px] tracking-[0.3em] uppercase">Continuará</p>
        <p className="max-w-[40ch] text-[clamp(1.4rem,2.6vw,2.4rem)] leading-tight">
          Lo que sigue lo escribe el plantel que cuelga en el vestuario.
        </p>
        <Link
          href="/"
          className="font-mono inline-flex h-11 items-center gap-2 border border-fondo px-6 text-[11px] tracking-[0.16em] uppercase transition-colors hover:bg-fondo hover:text-claro"
        >
          Volver al vestuario →
        </Link>
      </section>
    </div>
  )
}
