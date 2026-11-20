'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { saveCarnet } from '@/app/carnet/actions'
import { CrowdSound } from '@/components/bombonera/crowdSound'
import { Plano } from '@/components/bombonera/Plano'
import { CarnetEditor } from '@/components/carnet/CarnetEditor'
import { Guilloche } from '@/components/carnet/Guilloche'
import { Credito } from '@/components/idolos/Retrato'
import { TriviaGame } from '@/components/trivia/TriviaGame'
import { useReducedMotion, useWebGL2 } from '@/components/vitrina/support'
import { idolos } from '@/data/idolos'
import { apellido, formatEtapas, iniciales, numero, temporadas } from '@/engine/idolos'
import { CARNET_DEFAULTS, currentYear } from '@/lib/domain/carnet'
import { UBICACIONES, spotSeat } from '@/three/bombonera/layout'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const StadiumCanvas = dynamic(() => import('@/components/bombonera/StadiumCanvas'), {
  ssr: false,
  loading: () => (
    <p role="status" className="eyebrow absolute inset-0 grid place-items-center text-oro">
      Prendiendo las luces de La Bombonera…
    </p>
  ),
})

const PAD = 'px-[clamp(1.25rem,4vw,3rem)]'
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oro'
const SPOTS = UBICACIONES.map((u) => ({ ...u, seat: spotSeat(u) }))

const AERIAL = {
  eyebrow: 'Vista aérea',
  label: 'La caja de bombones',
  caption:
    'Tres lados de tribunas que se curvan y un cuarto lado recto, casi vertical, con palcos. Elegí una ubicación o tocá una tribuna.',
}

function findScroller(el) {
  if (typeof window === 'undefined') return null
  let curr = el?.parentElement
  while (curr && curr !== document.body && curr !== document.documentElement) {
    const ov = window.getComputedStyle(curr).overflowY
    if (ov === 'auto' || ov === 'scroll') return curr
    curr = curr.parentElement
  }
  return window
}

/**
 * 03 · Salón de ídolos integrado en la landing: experiencia de doble eje (vertical + horizontal).
 * El scroll vertical descubre la historia/hitos del ídolo activo y avanza suavemente hacia
 * el siguiente ídolo a la derecha, con barra de navegación inferior, progreso e interactividad.
 */
export function IdolosSection() {
  const root = useRef(null)
  const stage = useRef(null)
  const track = useRef(null)
  const chapters = useRef([])
  const chips = useRef(null)
  const progress = useRef(null)
  const journey = useRef(null)
  const current = useRef(-1)
  const scrollerEl = useRef(null)
  const [active, setActive] = useState(0)

  const total = numero(idolos.length)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const scene = stage.current
        const strip = track.current
        if (!scene || !strip || !root.current) return

        const scroller = findScroller(root.current)
        scrollerEl.current = scroller

        const timeline = gsap.timeline({ defaults: { ease: 'none' } })
        const stops = []

        chapters.current.forEach((chapter, i) => {
          if (!chapter) return
          const label = idolos[i].slug
          timeline.addLabel(label)
          const startTime = timeline.duration()

          // 1. Pausa inicial para apreciar el retrato y la cita
          timeline.to({}, { duration: 0.35 })

          // 2. Revelar detalles y desvanecer identidad
          const details = chapter.querySelector('[data-details]')
          const identity = chapter.querySelector('[data-identity]')
          const facts = chapter.querySelectorAll('[data-fact]')

          if (identity) {
            timeline.to(identity, { autoAlpha: 0, y: -20, duration: 0.35 }, `reveal-${i}`)
          }
          if (details) {
            timeline.fromTo(
              details,
              { autoAlpha: 0, y: 25 },
              { autoAlpha: 1, y: 0, duration: 0.45 },
              `reveal-${i}`,
            )
          }
          if (facts.length) {
            timeline.fromTo(
              facts,
              { autoAlpha: 0, y: 15 },
              { autoAlpha: 1, y: 0, duration: 0.25, stagger: 0.1 },
              `reveal-${i}+=0.1`,
            )
          }

          const detailsTime = timeline.duration()
          stops.push({ time: startTime, detailsTime, index: i })

          // 3. Pausa para leer los hitos
          timeline.to({}, { duration: 0.55 })

          // 4. Transición horizontal al siguiente ídolo o panel final
          timeline.to(strip, {
            x: () => -(i + 1) * scene.clientWidth,
            duration: 0.65,
            ease: 'power1.inOut',
          })
        })

        // Pausa en el panel de cierre
        timeline.to({}, { duration: 0.45 })

        const update = () => {
          const time = timeline.time()
          let index = 0
          for (const stop of stops) {
            if (time >= stop.time - 0.2) index = stop.index
          }
          const p = timeline.progress()
          if (progress.current) {
            progress.current.style.transform = `scaleX(${p})`
          }
          if (index === current.current) return
          current.current = index
          setActive(index)
          chapters.current.forEach((el, k) => {
            if (el) el.inert = k !== index
          })
        }

        timeline.eventCallback('onUpdate', update)

        const trigger = ScrollTrigger.create({
          trigger: root.current,
          scroller,
          animation: timeline,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.45,
          invalidateOnRefresh: true,
        })

        journey.current = { timeline, trigger, stops }
        update()

        const refresh = () => {
          ScrollTrigger.refresh()
        }
        const frame = requestAnimationFrame(refresh)
        let alive = true
        document.fonts?.ready?.then(() => {
          if (alive) refresh()
        })

        return () => {
          alive = false
          cancelAnimationFrame(frame)
          journey.current = null
          current.current = -1
          chapters.current.forEach((el) => {
            if (el) el.inert = false
          })
          if (progress.current) progress.current.style.transform = 'scaleX(0)'
        }
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  useEffect(() => {
    const strip = chips.current
    const chip = strip?.children[active]
    if (!chip) return
    strip.scrollTo({
      left: chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2,
      behavior: 'smooth',
    })
  }, [active])

  const goToIdol = (event, index, details = false) => {
    if (event) event.preventDefault()
    const route = journey.current
    if (!route) return
    const stop = route.stops[index]
    if (!stop) return
    const at = details ? stop.detailsTime : stop.time
    const ratio = at / route.timeline.duration()
    const target = route.trigger.start + ratio * (route.trigger.end - route.trigger.start)

    const scroller = scrollerEl.current
    const lenis = scroller?.__lenis || (typeof window !== 'undefined' && window.__bocaLenis)
    if (lenis) {
      lenis.scrollTo(target, { duration: details ? 0.9 : 1.2 })
    } else if (scroller && scroller !== window) {
      scroller.scrollTo({ top: target, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: target, behavior: 'smooth' })
    }
  }

  const keyboard = (event) => {
    if (!journey.current || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.target.closest('a, button, input, select, textarea')) return
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (direction) {
      event.preventDefault()
      const nextIndex = Math.max(0, Math.min(active + direction, idolos.length - 1))
      goToIdol(event, nextIndex)
    }
  }

  return (
    <section aria-labelledby="landing-idolos-title" className="relative border-t border-white/10 bg-[#05080f]">
      {/* Cabecera introductoria del Capítulo 03 */}
      <div id="sec-idolos" className="paper-grunge border-b border-white/10 px-[clamp(1.25rem,4vw,3rem)] pt-20 pb-12">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-oro/30 pb-8">
            <div>
              <p className="eyebrow text-oro">Capítulo 03 · Leyendas del club</p>
              <h2
                id="landing-idolos-title"
                data-reveal-up
                className="print-ink mt-3 font-display text-[clamp(3.2rem,8.5vw,8rem)] leading-[0.88] text-oro uppercase"
              >
                Salón de <span className="text-claro">ídolos</span>
              </h2>
            </div>
            <div className="max-w-[44ch]">
              <p className="text-sm leading-relaxed text-claro/75">
                Diez nombres grabados en el alma de Boca. El scroll vertical descubre sus hitos y te hace avanzar
                horizontalmente en el tiempo.
              </p>
              <p className="mt-3 flex items-center gap-2 font-mono text-xs tracking-wider text-oro uppercase">
                <span>Scroll vertical</span>
                <span className="animate-bounce" aria-hidden="true">↓</span>
                <span className="text-claro/50">· Recorrido horizontal →</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Escenario de doble eje: el contenedor mide 2200vh y la escena se fija con sticky */}
      <div
        ref={root}
        className="relative"
        style={{ height: `${(idolos.length + 1) * 200}vh` }}
      >
        <div
          ref={stage}
          tabIndex={0}
          onKeyDown={keyboard}
          aria-label="Salón de ídolos de Boca Juniors. Deslizá para descubrir la historia de cada leyenda y avanzar a la derecha."
          className="paper-grunge sticky top-0 flex h-dvh w-full flex-col overflow-hidden select-none bg-[#05080f] outline-none"
        >
          {/* Tira horizontal con las 10 leyendas + panel final */}
          <div ref={track} className="flex h-full w-max will-change-transform">
            {idolos.map((idolo, i) => (
              <section
                key={idolo.slug}
                id={`idolo-${idolo.slug}`}
                ref={(el) => {
                  chapters.current[i] = el
                }}
                aria-labelledby={`idolo-${idolo.slug}-nombre`}
                className="relative flex h-full w-screen shrink-0 items-center justify-center overflow-hidden px-[clamp(1.25rem,5vw,5rem)] pt-16 pb-28 md:pt-20 md:pb-32"
              >
                {/* Número gigante en filigrana de fondo */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-[8%] right-[4vw] z-0 font-display text-[clamp(14rem,38vw,48vh)] leading-none text-oro/[0.045] select-none"
                >
                  {numero(idolo.numero)}
                </span>

                <div className="relative z-10 mx-auto grid h-full max-h-[80vh] w-full max-w-[1500px] items-center gap-8 md:grid-cols-2 md:gap-14 lg:gap-20">
                  {/* Columna Izquierda: Retrato de época en semitono con crédito de licencia */}
                  <div className="flex h-full max-h-[66vh] flex-col justify-center">
                    <figure className="relative mx-auto flex h-full max-h-[58vh] w-full max-w-md flex-col">
                      {idolo.foto ? (
                        <>
                          <div className="print-photo relative flex-1 min-h-0 w-full overflow-hidden rounded-2xl border border-oro/35 bg-noche shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
                            <Image
                              src={idolo.foto.src}
                              alt={idolo.foto.caption}
                              fill
                              sizes="(min-width: 900px) 46vw, 92vw"
                              priority={i < 2}
                              className="object-cover object-top"
                            />
                          </div>
                          <Credito foto={idolo.foto} className="pt-2 text-claro/55" />
                        </>
                      ) : (
                        <div
                          role="img"
                          aria-label={`${idolo.nombre}: sin foto libre`}
                          className="paper-grunge grid flex-1 min-h-0 w-full place-items-center rounded-2xl border border-oro/40 bg-noche/60"
                        >
                          <span className="print-ink font-display text-[clamp(6rem,18vh,10rem)] text-oro">
                            {iniciales(idolo.nombre)}
                          </span>
                          <span className="eyebrow mt-2 text-claro/50">Sin foto libre</span>
                        </div>
                      )}
                    </figure>
                  </div>

                  {/* Columna Derecha: Vista superpuesta de Identidad (inicial) y Detalles (al scrollear) */}
                  <div className="relative grid grid-cols-1 grid-rows-1 items-center max-w-xl">
                    {/* Capa 1: Identidad del Ídolo */}
                    <div data-identity className="col-start-1 row-start-1 flex flex-col justify-center pr-2 md:pr-6">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-semibold tracking-[0.2em] text-oro uppercase">
                          Leyenda {numero(idolo.numero)} / {total}
                        </span>
                        <span className="h-px w-8 bg-oro/40" />
                        <span className="font-mono text-xs tracking-wider text-claro/60 uppercase">
                          {idolo.rol}
                        </span>
                      </div>

                      <h3
                        id={`idolo-${idolo.slug}-nombre`}
                        className="print-ink mt-3 font-display text-[clamp(2.8rem,6.2vw,6.5rem)] leading-[0.88] text-claro uppercase"
                      >
                        {idolo.nombre}
                      </h3>

                      {idolo.apodo && (
                        <p className="mt-2 font-serif text-[clamp(1.8rem,3vw,3.2rem)] leading-none text-oro italic">
                          «{idolo.apodo}»
                        </p>
                      )}

                      <blockquote className="mt-5 max-w-[38ch] border-l-2 border-oro/45 pl-4 font-serif text-[clamp(1.05rem,1.4vw,1.35rem)] leading-relaxed text-claro/85 italic">
                        &ldquo;{idolo.frase}&rdquo;
                      </blockquote>

                      <button
                        type="button"
                        onClick={(e) => goToIdol(e, i, true)}
                        className={`${focus} mt-7 inline-flex w-fit items-center gap-3 border-b border-oro/60 pb-1.5 font-mono text-xs tracking-[0.16em] text-oro uppercase transition-colors hover:border-oro hover:text-white`}
                      >
                        <span>Descubrí su historia</span>
                        <span className="animate-bounce" aria-hidden="true">↓</span>
                      </button>
                    </div>

                    {/* Capa 2: Detalles / Hitos del Ídolo (se revela al deslizar hacia abajo) */}
                    <div
                      data-details
                      className="invisible col-start-1 row-start-1 flex flex-col justify-center opacity-0 pr-2 md:pr-6"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                        <p className="font-mono text-xs font-semibold tracking-[0.18em] text-oro uppercase">
                          {numero(idolo.numero)} / {total} · Su huella en Boca
                        </p>
                        <p className="font-mono text-xs tracking-[0.14em] text-claro/60 uppercase">
                          {formatEtapas(idolo.etapas)} · {temporadas(idolo.etapas)} temporadas
                        </p>
                      </div>

                      <h3 className="print-ink mt-3 font-display text-[clamp(2.2rem,4.5vw,4.2rem)] leading-[0.92] text-claro uppercase">
                        {idolo.nombre}
                      </h3>

                      <ol className="mt-5 divide-y divide-white/10 border-y border-white/10">
                        {idolo.datos.map((dato, d) => (
                          <li data-fact key={dato} className="grid grid-cols-[28px_1fr] items-start gap-3 py-3 md:py-3.5">
                            <span className="font-mono text-xs font-bold text-oro">{numero(d + 1)}</span>
                            <p className="text-[clamp(0.9rem,1.15vw,1.15rem)] leading-snug text-claro/90">{dato}</p>
                          </li>
                        ))}
                      </ol>

                      <div className="mt-6 flex flex-wrap items-center gap-4">
                        <Link
                          href={`/idolos/${idolo.slug}`}
                          className={`${focus} inline-flex items-center gap-2 rounded-full border border-oro/50 bg-oro/10 px-4 py-2 font-mono text-xs font-medium tracking-wider text-oro uppercase transition hover:border-oro hover:bg-oro hover:text-fondo`}
                        >
                          Ficha completa ↗
                        </Link>
                        {idolo.fuentes.map((f) => (
                          <a
                            key={f.url}
                            href={f.url}
                            target="_blank"
                            rel="noopener"
                            className={`${focus} font-mono text-[10px] tracking-wider text-claro/50 underline decoration-white/20 underline-offset-4 hover:text-claro`}
                          >
                            Fuente: {f.label} ↗
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ))}

            {/* Panel de cierre del Capítulo 03 */}
            <div className="relative flex h-full w-[min(48rem,90vw)] shrink-0 flex-col justify-center px-[6vw]">
              <p className="eyebrow text-oro">Capítulo 03 completo · 10 leyendas eternas</p>
              <h3 className="print-ink mt-3 font-display text-[clamp(2.8rem,6.5vw,6rem)] leading-[0.9] text-oro uppercase">
                El salón sigue abierto.
              </h3>
              <p className="mt-4 font-serif text-[clamp(1.5rem,2.8vw,2.5rem)] leading-snug text-claro/85 italic">
                El próximo nombre lo escribe el plantel que hoy defiende la azul y oro.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/idolos"
                  className={`${focus} inline-flex items-center gap-2 rounded-full border border-oro bg-oro px-5 py-2.5 font-mono text-xs font-semibold tracking-wider text-fondo uppercase transition hover:border-white hover:bg-white`}
                >
                  Ver archivo de ídolos completo ↗
                </Link>
                <span className="font-mono text-xs text-claro/50 uppercase">
                  Continuá bajando a La Bombonera ↓
                </span>
              </div>
            </div>
          </div>

          {/* Barra de navegación inferior HUD fija al pie del escenario */}
          <footer className="absolute inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#03060ef5] px-[clamp(1rem,4vw,3rem)] py-3 backdrop-blur-md">
            <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 pb-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold tracking-[0.16em] text-oro">
                  {numero(active + 1)} / {total}
                </span>
                <span className="font-display text-sm tracking-wide text-claro uppercase md:text-base">
                  {apellido(idolos[active].nombre)}
                </span>
                {idolos[active].apodo && (
                  <span className="hidden font-serif text-sm text-oro/80 italic md:inline">
                    «{idolos[active].apodo}»
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 font-mono text-[10px] tracking-wider text-claro/60 uppercase">
                <span className="hidden sm:inline">
                  Bajá para descubrir <span className="text-oro">↓</span>
                </span>
                <span>
                  El recorrido sigue <span className="text-oro">→</span>
                </span>
              </div>
            </div>

            {/* Barra de progreso de oro */}
            <div className="mx-auto h-[2px] w-full max-w-[1500px] overflow-hidden bg-white/10">
              <div
                ref={progress}
                className="h-full w-full origin-left bg-gradient-to-r from-oro/80 via-oro to-oro"
                style={{ transform: 'scaleX(0)' }}
              />
            </div>

            {/* Tira de chips rápidos para las 10 leyendas */}
            <nav aria-label="Navegar por las 10 leyendas" className="mx-auto max-w-[1500px] pt-2">
              <ol ref={chips} className="scrollbar-none flex gap-1.5 overflow-x-auto pb-0.5">
                {idolos.map((it, i) => {
                  const on = i === active
                  return (
                    <li key={it.slug} className="shrink-0">
                      <button
                        type="button"
                        onClick={(e) => goToIdol(e, i)}
                        aria-current={on ? 'true' : undefined}
                        className={`${focus} flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[10px] tracking-wider uppercase transition-colors ${
                          on
                            ? 'border border-oro bg-oro/20 font-bold text-oro'
                            : 'border border-transparent text-claro/60 hover:border-white/20 hover:text-claro'
                        }`}
                      >
                        <span className={on ? 'text-oro' : 'text-claro/40'}>{numero(it.numero)}</span>
                        <span>{apellido(it.nombre)}</span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </nav>
          </footer>
        </div>
      </div>
    </section>
  )
}

/**
 * 04 · La Bombonera 3D integrada en la landing: maqueta interactiva con vuelo
 * a cada bandeja/palco, sonido de tribuna y datos del Alberto J. Armando.
 */
export function BomboneraSection() {
  const webgl = useWebGL2()
  const reduced = useReducedMotion()
  const stage = useRef(null)
  const sound = useRef(null)
  const [lost, setLost] = useState(false)
  const [spot, setSpot] = useState(null)
  const [hover, setHover] = useState(null)
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [audible, setAudible] = useState(false)
  const three = webgl === true && !lost
  const plan = webgl === false || lost

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting)
        if (entry.isIntersecting) setMounted(true)
      },
      { rootMargin: '80% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible && audible && sound.current) {
      sound.current.setEnabled(false)
      setAudible(false)
    }
  }, [visible, audible])

  useEffect(() => sound.current?.setAerial(!spot), [spot])
  useEffect(() => () => sound.current?.dispose(), [])

  const toggleSound = () => {
    sound.current ??= new CrowdSound()
    const on = !audible
    sound.current.setEnabled(on)
    sound.current.setAerial(!spot)
    setAudible(on)
  }

  const onPick = useCallback(
    (z) =>
      setSpot({
        id: `tribuna:${z.zone}:${z.seat.x.toFixed(1)}:${z.seat.y.toFixed(1)}:${z.seat.z.toFixed(1)}`,
        label: z.name,
        caption: 'Elegiste un lugar tocando la tribuna. Probá otro, o volvé a la vista aérea.',
        seat: z.seat,
      }),
    [],
  )
  const onLost = useCallback(() => setLost(true), [])

  const info = spot
    ? { eyebrow: 'Vista desde tu ubicación', label: spot.label, note: spot.note, caption: spot.caption }
    : three
      ? AERIAL
      : { ...AERIAL, eyebrow: 'Plano visto desde arriba' }

  const chip = (on) =>
    `${focus} flex min-h-10 w-max shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-left transition-colors lg:w-full lg:rounded-none lg:border-x-0 lg:border-t-0 lg:px-1 lg:py-2.5 ${
      on
        ? 'border-oro bg-oro text-fondo lg:bg-transparent lg:text-oro'
        : 'border-oro/35 bg-fondo/80 text-claro hover:border-oro hover:text-oro lg:border-white/15 lg:bg-transparent'
    }`

  return (
    <section id="sec-bombonera" aria-labelledby="landing-bombonera-title" className="relative border-t border-white/10 bg-fondo pt-[12vh]">
      <div className={`mx-auto max-w-[1500px] ${PAD}`}>
        <div className="flex flex-wrap items-end justify-between gap-6 pb-8">
          <div>
            <p className="eyebrow text-oro">Capítulo 04 · El templo · La Boca</p>
            <h2
              id="landing-bombonera-title"
              data-reveal-up
              className="print-ink mt-3 font-display text-[clamp(3.2rem,9vw,8.5rem)] leading-[0.86] uppercase"
            >
              La <span className="text-oro">Bombonera</span>
            </h2>
          </div>
          {three ? (
            <button
              type="button"
              aria-pressed={audible}
              onClick={toggleSound}
              className={`${focus} eyebrow inline-flex min-h-11 items-center gap-2 rounded-full border border-oro/40 bg-fondo/80 px-5 text-oro hover:border-oro aria-pressed:bg-oro aria-pressed:text-fondo`}
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              {audible ? 'Sonido de tribuna encendido' : 'Escuchar la tribuna'}
            </button>
          ) : null}
        </div>
      </div>

      {/* Escenario 3D interactivo del estadio */}
      <div
        ref={stage}
        className="relative mx-auto h-[min(82dvh,760px)] min-h-[32rem] w-full overflow-hidden border-y border-white/10 bg-[#03060e]"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_58%,rgba(120,150,230,0.16),transparent_70%)]"
        />
        {three && mounted ? (
          <StadiumCanvas
            seat={spot?.seat ?? null}
            active={visible}
            reduced={reduced}
            onPick={onPick}
            onHover={setHover}
            onLost={onLost}
          />
        ) : null}
        {plan ? (
          <div className="absolute inset-x-4 top-12 bottom-[13rem] sm:inset-x-8 lg:top-12 lg:right-[22rem] lg:bottom-24">
            <Plano spots={SPOTS} activeId={spot?.id ?? null} onSelect={setSpot} />
          </div>
        ) : null}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_55%,rgba(2,4,10,0.75)_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-fondo/90 via-fondo/40 to-transparent"
        />

        {/* Epígrafe de la ubicación activa */}
        <div className="pointer-events-none absolute inset-x-4 bottom-[5.75rem] z-10 max-w-md sm:inset-x-8 lg:bottom-8">
          <div aria-live="polite" className="text-shadow-scene">
            <p className="eyebrow text-oro">{info.eyebrow}</p>
            <h3 className="mt-2 font-display text-[clamp(1.8rem,4vw,3.1rem)] leading-[0.92] uppercase">
              {info.label}
              {info.note ? (
                <span className="ml-3 align-middle font-mono text-xs tracking-[0.18em] text-oro">{info.note}</span>
              ) : null}
            </h3>
            <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-claro/85">{info.caption}</p>
          </div>
          {three ? (
            <p aria-hidden="true" className="eyebrow mt-2.5 min-h-4 text-claro/55">
              {hover
                ? `Clic para sentarte en ${(typeof hover === 'string' ? hover : hover.shortName || hover.name || '').toLowerCase()}${hover.priceLabel ? ` (${hover.priceLabel})` : ''}`
                : 'Tocá una tribuna o elegí una ubicación'}
            </p>
          ) : null}
        </div>

        {/* Selector de ubicaciones */}
        <nav
          aria-label="Ubicaciones de La Bombonera"
          className="absolute inset-x-0 bottom-0 z-20 lg:inset-x-auto lg:top-1/2 lg:right-8 lg:bottom-auto lg:w-72 lg:-translate-y-1/2"
        >
          <p className="eyebrow mb-2.5 hidden text-claro/55 lg:block">Ubicaciones</p>
          <ul className="scrollbar-none flex snap-x gap-2 overflow-x-auto px-4 pt-2 pb-4 lg:flex-col lg:gap-0 lg:overflow-visible lg:p-0">
            <li className="contents">
              <button
                type="button"
                aria-pressed={spot === null}
                onClick={() => setSpot(null)}
                className={chip(spot === null)}
              >
                <span className="font-mono text-[11px] tracking-[0.14em] uppercase">Vista aérea</span>
              </button>
            </li>
            {SPOTS.map((s, i) => (
              <li key={s.id} className="contents">
                <button
                  type="button"
                  aria-pressed={spot?.id === s.id}
                  onClick={() => setSpot(s)}
                  className={chip(spot?.id === s.id)}
                >
                  <span aria-hidden="true" className="font-mono text-[11px] tabular-nums opacity-70">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-bold whitespace-nowrap">{s.label}</span>
                  {s.note ? (
                    <span className="font-mono text-[10px] tracking-[0.14em] uppercase opacity-70">{s.note}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Datos del estadio */}
      <div className={`mx-auto max-w-[1500px] py-14 ${PAD}`}>
        <dl className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
          {[
            ['Nombre oficial', 'Estadio Alberto J. Armando'],
            ['Inauguración', '25 de mayo de 1940'],
            ['Arquitectura', 'Tres bandejas curvas y palcos a plomo («La caja de bombones»)'],
          ].map(([k, v]) => (
            <div key={k} className="bg-fondo p-6">
              <dt className="eyebrow text-oro/80">{k}</dt>
              <dd className="mt-2.5 text-base leading-snug font-bold text-claro">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/**
 * 05 · Carnet de hincha virtual integrado en la landing: editor en vivo con
 * frente/dorso giratorio, descarga en PNG y guardado en cuenta.
 */
export function CarnetSection() {
  const [today] = useState(() => new Date().toISOString())
  const maxYear = currentYear()

  return (
    <section
      id="sec-carnet"
      aria-labelledby="landing-carnet-title"
      className={`paper-grunge relative isolate overflow-hidden border-t border-white/10 py-[14vh] ${PAD}`}
    >
      <Guilloche className="pointer-events-none absolute -top-12 right-[-10%] -z-10 h-[120%] w-[70%] text-oro opacity-[0.1] md:right-0 md:w-[55%]" />
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-12 flex flex-wrap items-end justify-between gap-6 border-b border-oro/30 pb-8">
          <div>
            <p className="eyebrow text-oro">Capítulo 05 · Credencial virtual</p>
            <h2
              id="landing-carnet-title"
              data-reveal-up
              className="print-ink mt-3 font-display text-[clamp(3.2rem,9vw,8.5rem)] leading-[0.86] text-oro uppercase"
            >
              Tu carnet <span className="text-claro">xeneize</span>
            </h2>
          </div>
          <p className="max-w-[42ch] text-sm leading-relaxed text-claro/75">
            Tu nombre, desde qué año sos de Boca, tu tribuna y tu ídolo. Se estampa en vivo:{' '}
            <span className="font-serif text-lg text-oro italic">podés darlo vuelta y descargarlo en PNG.</span>
          </p>
        </header>

        <CarnetEditor
          action={saveCarnet}
          initial={CARNET_DEFAULTS}
          saved={null}
          maxYear={maxYear}
          today={today}
        />
      </div>
    </section>
  )
}

/**
 * 06 · Trivia xeneize integrada en la landing: jugá la ronda completa de 10
 * preguntas sin salir de la página.
 */
export function TriviaSection() {
  return (
    <section
      id="sec-trivia"
      aria-labelledby="landing-trivia-title"
      className={`relative border-t border-white/10 bg-fondo py-[14vh] ${PAD}`}
    >
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-12 flex flex-wrap items-end justify-between gap-6 border-b border-white/15 pb-8">
          <div>
            <p className="eyebrow text-oro">Capítulo 06 · Ponete a prueba</p>
            <h2
              id="landing-trivia-title"
              data-reveal-up
              className="print-ink mt-3 font-display text-[clamp(3.2rem,9vw,8.5rem)] leading-[0.86] uppercase"
            >
              Trivia <span className="text-oro">xeneize</span>
            </h2>
          </div>
          <Link
            href="/trivia/ranking"
            className={`${focus} eyebrow inline-flex h-10 items-center gap-2 rounded-full border border-oro/40 px-5 text-oro hover:bg-oro hover:text-fondo`}
          >
            Ver tabla de posiciones ↗
          </Link>
        </header>

        <TriviaGame embedded />
      </div>
    </section>
  )
}
