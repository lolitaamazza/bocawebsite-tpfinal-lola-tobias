'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SiteMenu } from '@/components/layout/SiteMenu'
import { useReducedMotion, useWebGL2 } from '@/components/vitrina/support'
import { UBICACIONES, spotSeat } from '@/three/bombonera/layout'
import { CrowdSound } from './crowdSound'
import { Plano } from './Plano'

// three y el lienzo se bajan aparte: el texto y la lista aparecen enseguida
const StadiumCanvas = dynamic(() => import('./StadiumCanvas'), {
  ssr: false,
  loading: () => (
    <p role="status" className="eyebrow absolute inset-0 grid place-items-center text-oro">
      Prendiendo las luces…
    </p>
  ),
})

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oro'
/** Las ubicaciones de la lista con su butaca ya calculada (identidad estable) */
const SPOTS = UBICACIONES.map((u) => ({ ...u, seat: spotSeat(u) }))

const AERIAL = {
  eyebrow: 'Vista aérea',
  label: 'La caja de bombones',
  caption: 'Tres lados de tribunas que se curvan y un cuarto lado recto, casi vertical, con palcos. Elegí una ubicación o tocá una tribuna.',
}

/** Rótulo de lo que se está mirando: se anuncia a los lectores de pantalla */
function Caption({ spot, hover, three }) {
  const info = spot
    ? { eyebrow: 'Vista desde tu ubicación', label: spot.label, note: spot.note, caption: spot.caption }
    : three
      ? AERIAL
      : { ...AERIAL, eyebrow: 'Plano visto desde arriba' }
  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-[6.25rem] z-10 max-w-md sm:inset-x-8 lg:bottom-10">
      <div aria-live="polite" className="text-shadow-scene">
        <p className="eyebrow text-oro">{info.eyebrow}</p>
        <h2 className="mt-2 font-display text-[clamp(1.9rem,4.4vw,3.4rem)] leading-[0.92] uppercase">
          {info.label}
          {info.note ? <span className="ml-3 align-middle font-mono text-xs tracking-[0.18em] text-oro">{info.note}</span> : null}
        </h2>
        <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-claro/85 md:text-base">{info.caption}</p>
      </div>
      {three ? (
        <p aria-hidden="true" className="eyebrow mt-3 min-h-4 text-claro/55">
          {hover ? `Clic para sentarte en ${hover.toLowerCase()}` : <span className="pointer-coarse:hidden">Pasá el mouse por las tribunas</span>}
        </p>
      ) : null}
    </div>
  )
}

/** Lista de ubicaciones: columna a la derecha en escritorio, fichas que se deslizan en el celular */
function Ubicaciones({ activeId, onSelect }) {
  const chip = (on) =>
    `${focus} flex min-h-11 w-max shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-left transition-colors lg:w-full lg:rounded-none lg:border-x-0 lg:border-t-0 lg:px-1 lg:py-3 ${
      on ? 'border-oro bg-oro text-fondo lg:bg-transparent lg:text-oro' : 'border-oro/35 bg-fondo/80 text-claro hover:border-oro hover:text-oro lg:border-white/15 lg:bg-transparent'
    }`
  return (
    <nav aria-label="Elegí una ubicación" className="absolute inset-x-0 bottom-0 z-20 lg:inset-x-auto lg:top-1/2 lg:right-8 lg:bottom-auto lg:w-72 lg:-translate-y-1/2">
      <p className="eyebrow mb-3 hidden text-claro/55 lg:block">Ubicaciones</p>
      <ul className="scrollbar-none flex snap-x gap-2 overflow-x-auto px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] lg:flex-col lg:gap-0 lg:overflow-visible lg:p-0">
        <li className="contents">
          <button type="button" aria-pressed={activeId === null} onClick={() => onSelect(null)} className={chip(activeId === null)}>
            <span className="font-mono text-[11px] tracking-[0.14em] uppercase">Vista aérea</span>
          </button>
        </li>
        {SPOTS.map((s, i) => (
          <li key={s.id} className="contents">
            <button type="button" aria-pressed={activeId === s.id} onClick={() => onSelect(s)} className={chip(activeId === s.id)}>
              <span aria-hidden="true" className="font-mono text-[11px] tabular-nums opacity-70">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-sm font-bold whitespace-nowrap">{s.label}</span>
              {s.note ? <span className="font-mono text-[10px] tracking-[0.14em] uppercase opacity-70">{s.note}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * La Bombonera en 3D: vuelta de entrada, después elegís una ubicación (de la
 * lista o tocando la tribuna) y la cámara vuela hasta esa butaca. Sin WebGL2
 * (o si se pierde el contexto) queda el plano visto desde arriba con la misma lista.
 */
export function Bombonera() {
  const webgl = useWebGL2()
  const reduced = useReducedMotion()
  const stage = useRef(null)
  const sound = useRef(null)
  const [lost, setLost] = useState(false)
  const [spot, setSpot] = useState(null)
  const [hover, setHover] = useState(null)
  const [visible, setVisible] = useState(true)
  const [audible, setAudible] = useState(false)
  const three = webgl === true && !lost
  const plan = webgl === false || lost

  // dibuja solo mientras el estadio está en pantalla
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

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

  return (
    <main
      className="relative bg-fondo text-claro"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && spot) {
          e.preventDefault()
          setSpot(null)
        }
      }}
    >
      <section ref={stage} aria-labelledby="bombonera-title" className="relative h-dvh min-h-[34rem] overflow-hidden">
        {/* mientras baja three: noche con el resplandor de los reflectores */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[#03060e] bg-[radial-gradient(70%_55%_at_50%_58%,rgba(120,150,230,0.16),transparent_70%)]"
        />
        {three ? (
          <StadiumCanvas seat={spot?.seat ?? null} active={visible} reduced={reduced} onPick={onPick} onHover={setHover} onLost={onLost} />
        ) : null}
        {plan ? (
          <div className="absolute inset-x-4 top-28 bottom-[15rem] sm:inset-x-8 lg:top-24 lg:right-[22rem] lg:bottom-48">
            <Plano spots={SPOTS} activeId={spot?.id ?? null} onSelect={setSpot} />
          </div>
        ) : null}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_55%,rgba(2,4,10,0.75)_100%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-fondo/90 via-fondo/40 to-transparent" />

        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 bg-gradient-to-b from-fondo/90 via-fondo/50 to-transparent px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-10 sm:px-8 md:pt-5">
          <div className="flex items-start gap-3 sm:gap-5">
            <SiteMenu />
            <div>
              <p className="eyebrow text-oro">Estadio Alberto J. Armando</p>
              <h1 id="bombonera-title" className="mt-1 font-display text-[clamp(2.1rem,5.5vw,4.6rem)] leading-[0.88] uppercase">
                La Bombonera
              </h1>
            </div>
          </div>
          {three ? (
            <button
              type="button"
              aria-pressed={audible}
              onClick={toggleSound}
              className={`${focus} eyebrow pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-oro/35 bg-fondo/80 px-4 text-oro hover:border-oro aria-pressed:bg-oro aria-pressed:text-fondo`}
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              {audible ? 'Sonido encendido' : 'Sonido apagado'}
            </button>
          ) : null}
        </header>

        {plan ? (
          <p className="absolute inset-x-4 top-[5.6rem] z-10 text-xs text-claro/60 sm:inset-x-8 lg:top-auto lg:bottom-10 lg:left-auto lg:right-[22rem] lg:max-w-xs lg:text-right">
            Tu navegador no muestra 3D (WebGL2), así que queda el plano visto desde arriba.
          </p>
        ) : null}
        <Caption spot={spot} hover={hover} three={three} />
        <Ubicaciones activeId={spot?.id ?? null} onSelect={setSpot} />
      </section>

      <section aria-labelledby="datos-title" className="border-t border-white/10 px-[clamp(1.25rem,4vw,3rem)] py-[12vh]">
        <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <p className="eyebrow text-oro/80">La Boca · Buenos Aires</p>
            <h2 id="datos-title" className="mt-4 font-display text-[clamp(2.6rem,6vw,5rem)] leading-[0.9] uppercase">
              Por qué <span className="text-oro">Bombonera</span>
            </h2>
            <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-claro/75">
              Le dicen así por su forma: tres lados de tribunas empinadas que se curvan en las esquinas y un cuarto lado recto, casi
              vertical, como una caja de bombones.
            </p>
          </div>
          <dl className="grid gap-px self-end bg-white/10 sm:grid-cols-3">
            {[
              ['Nombre oficial', 'Estadio Alberto J. Armando'],
              ['Inauguración', '25 de mayo de 1940'],
              ['Barrio', 'La Boca, Buenos Aires'],
            ].map(([k, v]) => (
              <div key={k} className="bg-fondo p-5">
                <dt className="eyebrow text-claro/50">{k}</dt>
                <dd className="mt-3 text-lg leading-snug font-extrabold tracking-tight">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mx-auto mt-12 max-w-6xl font-mono text-[10px] leading-relaxed tracking-[0.08em] text-claro/40 uppercase">
          Maqueta 3D estilizada, hecha con código: las proporciones son aproximadas. Tributo no oficial.
        </p>
      </section>
    </main>
  )
}
