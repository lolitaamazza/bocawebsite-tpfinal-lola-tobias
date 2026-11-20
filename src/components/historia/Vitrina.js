'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Image from 'next/image'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import CabinetCanvas from '@/components/vitrina/CabinetCanvas'
import { FotoCards } from '@/components/vitrina/FotoCards'
import { itemState, shelfFocus, togglePin } from '@/components/vitrina/focus'
import { findScroller } from '@/components/vitrina/scroller'
import { useMedia, useReducedMotion, useWebGL2 } from '@/components/vitrina/support'
import { logros } from '@/data/logros'
import { cabinetLayout, trophyRows } from '@/three/trophies/layout'
import { TROPHIES } from '@/three/trophies/profiles'
import { activeShelf, uniformStops, walkStops } from '@/three/trophies/rig'

gsap.registerPlugin(ScrollTrigger)

const ROWS = trophyRows(logros)
const CABINET = cabinetLayout(ROWS)
const BY_ID = new Map(logros.map((l) => [l.id, l]))
const TOTAL = logros.find((l) => l.total)
const PAD = 'px-[clamp(1.25rem,4vw,3rem)]'
const pad2 = (n) => String(n).padStart(2, '0')
const yearsOf = (l) => (l.range ? `${l.years[0]} — ${l.years[1]}` : l.years.join(' · '))

/** Epígrafe de la foto con el crédito que pide la licencia */
function Credit({ foto }) {
  return (
    <figcaption className="mt-2 font-mono text-[9px] leading-snug tracking-[0.08em] text-claro/40 uppercase">
      {foto.caption}{' '}
      <a
        href={foto.page}
        target="_blank"
        rel="noopener"
        className="underline decoration-white/20 underline-offset-2 hover:text-claro"
      >
        {foto.author} · {foto.license} ↗
      </a>
    </figcaption>
  )
}

/** "22 títulos internacionales": un total que incluye a otros, se cuenta en vez de apilarse */
function Total({ logro }) {
  if (!logro) return null
  const { foto } = logro
  return (
    <div className={PAD}>
      <div className="relative mx-auto mt-[12vh] grid max-w-[1500px] items-end gap-x-[clamp(1.5rem,4vw,4rem)] gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div data-reveal-up>
          <p className="eyebrow text-oro/80">En total · {yearsOf(logro)}</p>
          <h3 className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-1">
            <span data-count={logro.count} className="font-display text-[clamp(6.5rem,17vw,15rem)] leading-[0.78] text-oro tabular-nums">
              {logro.count}
            </span>{' '}
            <span className="pb-[0.2em] font-display text-[clamp(1.9rem,3.8vw,3.6rem)] leading-[0.92] uppercase">{logro.title}</span>
          </h3>
          <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-claro/70">{logro.text}</p>
          <p className="mt-3 max-w-[46ch] text-[13px] leading-relaxed text-claro/45">
            En la vitrina cada copa está tantas veces como se ganó: un estante por trofeo, de arriba hacia abajo.
          </p>
        </div>
        {foto ? (
          <figure data-reveal-up>
            <div className="relative overflow-hidden bg-noche" style={{ aspectRatio: `${foto.width} / ${foto.height}` }}>
              <Image src={foto.src} alt={foto.caption} fill loading="eager" decoding="async" sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
            </div>
            <Credit foto={foto} />
          </figure>
        ) : null}
      </div>
    </div>
  )
}

/** Placa sobre el lienzo: título, años y el número que cuenta hasta su valor */
function Placa({ row, reduced }) {
  const num = useRef(null)
  // se queda con el último estante mientras se desvanece
  const [shown, setShown] = useState(row)
  if (row !== null && row !== shown) setShown(row)
  const r = shown === null ? null : ROWS[shown]

  useLayoutEffect(() => {
    const el = num.current
    if (!el || row === null) return
    const to = ROWS[row].count
    if (reduced) {
      el.textContent = String(to)
      return
    }
    const n = { v: 0 }
    el.textContent = '0'
    const tween = gsap.to(n, {
      v: to,
      duration: 0.9,
      ease: 'power3.out',
      onUpdate: () => {
        el.textContent = String(Math.round(n.v))
      },
    })
    return () => tween.kill()
  }, [row, reduced])

  return (
    <div
      aria-hidden="true"
      data-on={row !== null}
      className="pointer-events-none absolute bottom-[clamp(1rem,3vh,2rem)] left-[clamp(1rem,2.5vw,2rem)] max-w-[min(24rem,72%)] transition-[opacity,translate] duration-500 data-[on=false]:translate-y-3 data-[on=false]:opacity-0"
    >
      {r ? (
        <>
          <p className="eyebrow text-oro">
            {TROPHIES[r.type].name} · {yearsOf(r)}
          </p>
          {/* el número lo escribe el efecto (cuenta desde 0): React no le pone hijos */}
          <p ref={num} className="mt-2 font-display text-[clamp(4rem,8vw,7rem)] leading-[0.8] text-claro tabular-nums" />
          <p className="mt-2 text-[clamp(1.1rem,1.7vw,1.6rem)] leading-tight font-extrabold tracking-tight">{r.title}</p>
        </>
      ) : null}
    </div>
  )
}

/** Un estante en la lista: es el contenido real (lector de pantalla, teclado, créditos) */
function Item({ row, index, dim, lit, pinned, onEnter, onLeave, onToggle }) {
  const logro = BY_ID.get(row.id)
  const { foto } = logro
  return (
    <li
      data-dim={dim}
      onMouseEnter={() => onEnter(index)}
      onMouseLeave={onLeave}
      onFocus={() => onEnter(index)}
      onBlur={onLeave}
      className="flex flex-col justify-center border-t border-white/10 py-14 transition-opacity duration-500 first:border-t-0 lg:min-h-dvh lg:border-t-0 lg:py-[10vh] lg:data-[dim=true]:opacity-30"
    >
      <p className="eyebrow text-oro/80">
        Estante {pad2(index + 1)} / {pad2(ROWS.length)}
      </p>
      <h3 className="mt-4">
        <span
          data-count={logro.count}
          className={`block font-display text-[clamp(4.5rem,9vw,8.5rem)] leading-[0.82] tabular-nums transition-colors duration-500 ${lit ? 'text-oro' : 'text-oro/80'}`}
        >
          {logro.count}
        </span>{' '}
        <span className="mt-3 block text-[clamp(1.6rem,2.6vw,2.6rem)] leading-[1.02] font-extrabold tracking-tight">{logro.title}</span>
      </h3>
      <p className="mt-3 font-mono text-[10px] font-semibold tracking-[0.18em] text-claro/55 uppercase">{yearsOf(logro)}</p>
      <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-claro/75">{logro.text}</p>
      {foto ? (
        <figure className="mt-6 w-full max-w-[26rem]">
          <div className="relative aspect-[16/11] overflow-hidden bg-noche">
            <Image src={foto.src} alt={foto.caption} fill loading="eager" decoding="async" sizes="(min-width: 1024px) 26rem, 90vw" className="object-cover" />
          </div>
          <Credit foto={foto} />
        </figure>
      ) : null}
      <button
        type="button"
        aria-pressed={pinned}
        onClick={() => onToggle(index)}
        className="eyebrow mt-6 inline-flex h-9 w-fit items-center gap-2 rounded-full border border-oro/40 px-4 text-oro transition-colors hover:bg-oro/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oro aria-pressed:border-oro aria-pressed:bg-oro aria-pressed:text-fondo"
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
        Iluminar en la vitrina
      </button>
    </li>
  )
}

/**
 * El mueble 3D y su lista. Escritorio: lienzo pegado a la derecha (100dvh) y la
 * lista a la izquierda, un estante por pantalla; la cámara llega a cada estante
 * cuando su texto pasa por el medio. Celular: lienzo a lo ancho (70svh) que se
 * queda quieto mientras la cámara baja, y la lista después.
 */
function Gabinete({ onLost }) {
  const reduced = useReducedMotion()
  const wide = useMedia('(min-width: 1024px)')
  const track = useRef(null)
  const list = useRef(null)
  const walk = useRef({ p: 0, stops: uniformStops(ROWS.length), version: 0 })
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [scrolled, setScrolled] = useState(null)
  const [hover3d, setHover3d] = useState(null)
  const [hoverList, setHoverList] = useState(null)
  const [pinned, setPinned] = useState(null)
  const active = reduced ? null : scrolled
  const { highlight, label } = shelfFocus({ hover3d, hoverList, pinned, active, stacked: !wide })

  // Pre-monta la vitrina en segundo plano apenas abre la Historia (con frameloop="never"
  // hasta que entra en vista) para que al bajar ya esté compilada y dibujada sin espera.
  useEffect(() => {
    const el = track.current
    if (!el) return
    const timer = window.setTimeout(() => setMounted(true), 250)
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting)
        if (entry.isIntersecting) setMounted(true)
      },
      { rootMargin: '120% 0px' },
    )
    io.observe(el)
    return () => {
      clearTimeout(timer)
      io.disconnect()
    }
  }, [])

  // La cámara camina con el scroll de la Historia (una capa fija con scroll propio)
  useEffect(() => {
    const el = track.current
    const items = list.current
    if (reduced || !el || !items) return
    const scroller = findScroller(el) ?? undefined
    const state = walk.current
    let last = null
    // en escritorio cada parada cae cuando su ítem queda centrado; en celular, parejas
    const measure = () => {
      const beside = Math.abs(items.offsetTop - el.offsetTop) < 4
      state.stops = walkStops(ROWS.length, {
        centers: beside ? [...items.children].map((li) => li.offsetTop + li.offsetHeight / 2) : undefined,
        trackHeight: el.offsetHeight,
        viewport: scroller ? scroller.clientHeight : window.innerHeight,
      })
      state.version++
    }
    measure()
    const tween = gsap.to(state, {
      p: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        scroller,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onRefresh: measure,
        onUpdate: (self) => {
          const i = activeShelf(state.stops, self.progress)
          if (i !== last) setScrolled((last = i))
        },
      },
    })
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [reduced])

  const onHover = useCallback((i) => setHover3d(i), [])
  const onTap = useCallback((i) => setPinned((p) => togglePin(p, i)), [])
  const onLeave = useCallback(() => setHoverList(null), [])

  return (
    <div className="relative mt-[12vh] grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* celular: el carril alto es el recorrido; sin movimiento no hay recorrido y mide lo que el lienzo */}
      <div
        ref={track}
        className={`relative lg:order-2 lg:h-auto ${reduced ? 'h-[70svh]' : 'h-[calc(70svh+var(--rows)*36svh)]'}`}
        style={{ '--rows': ROWS.length }}
      >
        <div className="sticky top-[15svh] h-[70svh] overflow-hidden lg:top-0 lg:h-dvh">
          {/* mientras baja three: penumbra con la luz cálida arriba */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[#05080f] bg-[radial-gradient(70%_45%_at_50%_10%,rgba(255,190,98,0.14),transparent_70%)]"
          />
          {mounted ? (
            <CabinetCanvas
              cabinet={CABINET}
              active={visible}
              reduced={reduced}
              highlight={highlight}
              walk={walk}
              onHover={onHover}
              onTap={onTap}
              onLost={onLost}
            />
          ) : null}
          {/* velo bajo la placa: el texto se lee aunque detrás brille una copa */}
          <div
            aria-hidden="true"
            data-on={label !== null}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#05080f]/90 via-[#05080f]/45 to-transparent transition-opacity duration-500 data-[on=false]:opacity-0"
          />
          <Placa row={label} reduced={reduced} />
          <p
            aria-hidden="true"
            data-on={highlight === null}
            className="eyebrow pointer-events-none absolute top-4 right-[clamp(1rem,2.5vw,2rem)] text-claro/45 transition-opacity duration-500 data-[on=false]:opacity-0 lg:top-auto lg:bottom-[clamp(1rem,3vh,2rem)]"
          >
            <span className="pointer-coarse:hidden">Pasá el mouse por un estante</span>
            <span className="hidden pointer-coarse:inline">Tocá un estante</span>
          </p>
        </div>
      </div>

      <ol ref={list} aria-label="Logros en la vitrina" className={`relative lg:order-1 ${PAD}`}>
        {ROWS.map((row, i) => (
          <Item
            key={row.id}
            row={row}
            index={i}
            {...itemState(i, { active, highlight, pinned })}
            onEnter={setHoverList}
            onLeave={onLeave}
            onToggle={onTap}
          />
        ))}
      </ol>
    </div>
  )
}

/**
 * Vitrina: los logros de Boca en un mueble 3D con las copas hechas por código,
 * una por título y un estante por trofeo. Al bajar, la cámara recorre los
 * estantes de arriba hacia abajo. Sin WebGL2 (o si se pierde el contexto)
 * quedan las tarjetas con foto de siempre.
 */
export function Vitrina() {
  const webgl = useWebGL2()
  const [lost, setLost] = useState(false)
  const fail = useCallback(() => setLost(true), [])
  const three = webgl !== false && !lost

  return (
    <section
      id="sec-vitrina"
      aria-labelledby="vitrina-title"
      // sin overflow-hidden en 3D: rompería el sticky del lienzo (clip no crea scroll)
      className={`relative pt-[16vh] ${three ? 'overflow-x-clip pb-[16vh]' : 'overflow-hidden pb-[24vh]'}`}
    >
      {/* cuadrícula de fondo: 6 columnas y filas cada 25vh */}
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 grid grid-cols-6 ${PAD}`}>
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            data-gridline
            className="absolute top-0 bottom-0 w-px origin-top bg-white/[0.07]"
            style={{ left: `calc(clamp(1.25rem,4vw,3rem) + (100% - 2 * clamp(1.25rem,4vw,3rem)) * ${i / 6})` }}
          />
        ))}
        <span className="absolute inset-0 bg-[repeating-linear-gradient(180deg,transparent_0,transparent_calc(25vh-1px),rgba(255,255,255,0.05)_calc(25vh-1px),rgba(255,255,255,0.05)_25vh)]" />
      </div>

      <div className={PAD}>
        <header className="relative mx-auto flex max-w-[1500px] items-end justify-between gap-6">
          <p className="eyebrow hidden text-claro/55 md:block">1905 — 2026</p>
          <h2
            id="vitrina-title"
            data-reveal-up
            className="text-center font-display text-[clamp(4rem,15vw,15rem)] leading-[0.86] uppercase"
          >
            Vitrina
          </h2>
          <p className="eyebrow hidden text-claro/55 md:block">Logros</p>
        </header>
        <p data-reveal-up className="relative mx-auto mt-8 max-w-[52ch] text-center text-[15px] leading-relaxed text-claro/65">
          Lo que se ganó con esa camiseta puesta. Cada número, una noche que se cuenta en La Boca.
        </p>
      </div>

      {three ? (
        <>
          <Total logro={TOTAL} />
          <Gabinete onLost={fail} />
        </>
      ) : (
        <FotoCards logros={logros} />
      )}
    </section>
  )
}
