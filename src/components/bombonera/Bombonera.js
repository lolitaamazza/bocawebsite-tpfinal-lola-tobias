'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { useReducedMotion, useWebGL2 } from '@/components/vitrina/support'
import { SECTIONS, UBICACIONES, sectionById, spotSeat } from '@/three/bombonera/layout'
import { CrowdSound } from './crowdSound'
import { Plano } from './Plano'
import { TicketModal } from './TicketModal'

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

/** Las ubicaciones de la lista con su butaca y bloque de ticketing ya calculados */
const SPOTS = UBICACIONES.map((u) => {
  const seat = spotSeat(u)
  const sec = sectionById(seat.sectionId)
  return {
    ...u,
    seat,
    sectionId: seat.sectionId,
    sectionCode: seat.sectionCode,
    price: seat.price,
    priceLabel: seat.priceLabel,
    available: sec?.available ?? 12,
    gate: seat.gate,
    rowNumber: seat.rowNumber,
    seatNumber: seat.seatNumber,
    badge: sec?.badge ?? 'TRIBUNA',
  }
})

const STAGE_COPY = {
  tunnel: {
    eyebrow: '01 · Túnel de jugadores',
    label: 'Salida a la cancha',
    caption:
      'Desde el túnel bajo el lado recto hacia el césped iluminado de La Bombonera. Salí al campo para abrir el mapa 3D de sectores y elegir tu butaca.',
  },
  aerial: {
    eyebrow: '02 · Mapa 3D de ticketing',
    label: 'La caja de bombones',
    caption:
      'Pasá el cursor sobre cualquiera de los 33 sectores para iluminar su borde 3D y ver disponibilidad y precio. Hacé clic en un bloque para acercarte a sus filas.',
  },
  section: {
    eyebrow: '03 · Vista de sector y suites',
    label: 'Elegí fila y butaca',
    caption:
      'Frente a las bandejas, suites y cintas LED. Tocá cualquiera de las butacas iluminadas en la tribuna o pasá a la vista en primera persona desde el asiento.',
  },
  seat: {
    eyebrow: '04 · Vista desde tu ubicación',
    label: 'Desde tu butaca',
    caption:
      'Perspectiva real detrás del respaldo de tu asiento. Arrastrá para girar la cabeza o mirá hacia el tablero LED colgante y emití tu ticket.',
  },
}

/** Tooltip flotante de vidrio oscuro al pasar el cursor sobre un sector en 3D (estilo Reel) */
function SectionHoverTooltip({ hover, viewMode }) {
  if (!hover || viewMode === 'tunnel') return null
  const x = Math.min(Math.max(hover.clientX ?? 240, 140), 1100)
  const y = Math.max((hover.clientY ?? 220) - 18, 88)
  return (
    <div
      aria-hidden="true"
      style={{ transform: `translate3d(${x}px, ${y}px, 0)` }}
      className="pointer-events-none absolute top-0 left-0 z-30 -translate-x-1/2 -translate-y-full transition-transform duration-75 ease-out max-sm:hidden"
    >
      <div className="min-w-56 rounded-2xl border border-white/20 bg-[#060b18]/92 px-4 py-3 text-left shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-oro uppercase">
            {hover.sectionCode || hover.badge}
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            {hover.available ?? 12} disp.
          </span>
        </div>
        <p className="mt-1 font-sans text-sm font-bold text-white">{hover.shortName || hover.name}</p>
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-white/10 pt-2">
          <span className="font-mono text-[10px] tracking-[0.14em] text-claro/65 uppercase">
            {hover.fromSeatBeacon
              ? `Fila ${String(hover.rowNumber).padStart(2, '0')} · Butaca ${String(hover.seatNumber).padStart(2, '0')}`
              : viewMode === 'section'
                ? `Fila ${String(hover.rowNumber).padStart(2, '0')} · Asiento ${String(hover.seatNumber).padStart(2, '0')}`
                : 'Desde'}
          </span>
          <span className="font-display text-lg tracking-wide text-oro">{hover.priceLabel || '$85.000'}</span>
        </div>
      </div>
    </div>
  )
}

/** Rótulo lateral de lo que se está mirando: se anuncia a los lectores de pantalla */
function Caption({ spot, hover, viewMode, three }) {
  const stage = STAGE_COPY[viewMode] || STAGE_COPY.aerial
  const info =
    spot && (viewMode === 'seat' || viewMode === 'section')
      ? {
          eyebrow: stage.eyebrow,
          label: spot.label,
          note: spot.sectionCode || spot.note,
          caption: spot.caption || stage.caption,
        }
      : three
        ? stage
        : { ...STAGE_COPY.aerial, eyebrow: 'Plano visto desde arriba' }

  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-[9.8rem] z-10 max-w-md sm:inset-x-8 lg:bottom-24">
      <div aria-live="polite" className="text-shadow-scene">
        <p className="eyebrow text-oro">{info.eyebrow}</p>
        <h2 className="mt-1.5 font-display text-[clamp(1.75rem,4vw,3.1rem)] leading-[0.92] uppercase">
          {info.label}
          {info.note ? <span className="ml-3 align-middle font-mono text-xs tracking-[0.18em] text-oro">{info.note}</span> : null}
        </h2>
        <p className="mt-2 max-w-[42ch] text-xs leading-relaxed text-claro/85 sm:text-sm">{info.caption}</p>
      </div>
      {three && viewMode !== 'tunnel' ? (
        <p aria-hidden="true" className="eyebrow mt-2.5 min-h-4 text-claro/60">
          {hover
            ? viewMode === 'aerial'
              ? `Clic para explorar ${hover.shortName?.toLowerCase() || hover.name.toLowerCase()} (${hover.priceLabel})`
              : `Clic para sentarte en fila ${hover.rowNumber} · asiento ${hover.seatNumber}`
            : viewMode === 'seat'
              ? 'Arrastrá para mirar alrededor o hacia el tablero LED'
              : 'Pasá el mouse por los sectores iluminados'}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Barra flotante inferior en forma de píldora (Pill HUD del Reel):
 * muestra el sector, fila, asiento, precio, controles de vista y CTA dorado para emitir el ticket.
 */
function FloatingTicketPill({
  spot,
  viewMode,
  lookMode,
  onSetViewMode,
  onSetLookMode,
  onCycleSeat,
  onOpenTicket,
}) {
  if (!spot || viewMode === 'tunnel') return null
  const rowStr = String(spot.rowNumber ?? spot.seat?.rowNumber ?? 4).padStart(2, '0')
  const seatStr = String(spot.seatNumber ?? spot.seat?.seatNumber ?? 14).padStart(2, '0')
  const priceLabel = spot.priceLabel ?? spot.seat?.priceLabel ?? '$85.000'
  const code = spot.sectionCode ?? spot.seat?.sectionCode ?? 'SEC L2'

  return (
    <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-30 mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2.5 rounded-3xl border border-white/15 bg-[#070c19]/92 px-3.5 py-2.5 shadow-[0_22px_55px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:bottom-5 sm:rounded-full sm:px-5 sm:py-2.5">
      {/* Identificador de asiento y precio */}
      <div className="flex items-center gap-3">
        <span className="hidden size-2.5 rounded-full bg-oro shadow-[0_0_12px_#f0c057] sm:inline-block" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-oro uppercase">{code}</span>
            <span className="text-white/25">·</span>
            <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-claro/85 uppercase">
              Fila {rowStr} · Asiento {seatStr}
            </span>
          </div>
          <p className="text-xs font-bold text-white sm:text-sm">
            {spot.label} <span className="ml-1.5 font-mono text-xs font-bold text-oro">{priceLabel}</span>
          </p>
        </div>
      </div>

      {/* Selector de asiento contiguo y ángulo de cámara */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="inline-flex items-center rounded-full border border-white/12 bg-white/5 p-0.5">
          <button
            type="button"
            onClick={() => onCycleSeat(-1)}
            aria-label="Butaca anterior del sector"
            className={`${focus} grid size-7 place-items-center rounded-full font-mono text-xs text-claro/80 hover:bg-white/10 hover:text-white`}
          >
            ‹
          </button>
          <span className="px-2 font-mono text-[10px] tracking-[0.12em] text-claro/75 uppercase">Asiento {seatStr}</span>
          <button
            type="button"
            onClick={() => onCycleSeat(1)}
            aria-label="Siguiente butaca del sector"
            className={`${focus} grid size-7 place-items-center rounded-full font-mono text-xs text-claro/80 hover:bg-white/10 hover:text-white`}
          >
            ›
          </button>
        </div>

        {viewMode === 'section' ? (
          <button
            type="button"
            onClick={() => onSetViewMode('seat')}
            className={`${focus} min-h-8 rounded-full border border-oro/45 bg-oro/15 px-3.5 font-mono text-[10px] font-bold tracking-[0.14em] text-oro uppercase transition-colors hover:bg-oro hover:text-fondo`}
          >
            Sentarse (POV)
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onSetViewMode('section')}
              className={`${focus} min-h-8 rounded-full border border-white/15 bg-white/5 px-3 font-mono text-[10px] font-semibold tracking-[0.14em] text-claro/85 uppercase transition-colors hover:border-oro hover:text-oro`}
            >
              Ver fila
            </button>
            <button
              type="button"
              aria-pressed={lookMode === 'jumbotron'}
              onClick={() => onSetLookMode(lookMode === 'jumbotron' ? 'pitch' : 'jumbotron')}
              className={`${focus} min-h-8 rounded-full border px-3 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase transition-colors ${
                lookMode === 'jumbotron'
                  ? 'border-oro bg-oro/20 text-oro'
                  : 'border-white/15 bg-white/5 text-claro/80 hover:border-oro hover:text-oro'
              }`}
            >
              {lookMode === 'jumbotron' ? 'Mirar cancha' : 'Tablero LED'}
            </button>
          </>
        )}

        {/* Botón CTA dorado cálido (idéntico al pill CTA del Reel) */}
        <button
          type="button"
          onClick={onOpenTicket}
          className={`${focus} min-h-9 rounded-full bg-gradient-to-r from-[#e2a94e] via-[#f0c057] to-[#d99a3a] px-4 font-mono text-[11px] font-extrabold tracking-[0.15em] text-[#050914] uppercase shadow-[0_4px_20px_rgba(240,192,87,0.38)] transition-transform hover:brightness-105 active:scale-97`}
        >
          Emitir Ticket
        </button>
      </div>
    </div>
  )
}

/** Lista de ubicaciones y etapas de cámara: columna a la derecha en escritorio */
function Ubicaciones({ activeId, viewMode, topDown, onSelectSpot, onSelectTunnel, onSelectAerial, onToggleTopDown }) {
  const chip = (on) =>
    `${focus} flex min-h-10 w-max shrink-0 snap-start items-center justify-between gap-2 rounded-full border px-3.5 text-left transition-colors lg:w-full lg:rounded-none lg:border-x-0 lg:border-t-0 lg:px-1.5 lg:py-2.5 ${
      on
        ? 'border-oro bg-oro text-fondo lg:bg-transparent lg:text-oro'
        : 'border-oro/35 bg-fondo/85 text-claro hover:border-oro hover:text-oro lg:border-white/15 lg:bg-transparent'
    }`
  return (
    <nav
      aria-label="Elegí una ubicación"
      className="absolute inset-x-0 bottom-[5.2rem] z-20 lg:inset-x-auto lg:top-1/2 lg:right-8 lg:bottom-auto lg:w-76 lg:-translate-y-1/2"
    >
      <div className="mb-2.5 hidden items-center justify-between lg:flex">
        <p className="eyebrow text-claro/55">Recorrido & Sectores</p>
        <button
          type="button"
          onClick={onToggleTopDown}
          className={`${focus} font-mono text-[10px] tracking-[0.14em] text-oro/85 uppercase hover:text-oro`}
        >
          {topDown ? 'Vista: Cenital' : 'Vista: 3D Oblicua'}
        </button>
      </div>
      <ul className="scrollbar-none flex snap-x gap-2 overflow-x-auto px-4 pt-1 pb-2 lg:flex-col lg:gap-0 lg:overflow-visible lg:p-0">
        <li className="contents">
          <button
            type="button"
            aria-pressed={viewMode === 'tunnel'}
            onClick={onSelectTunnel}
            className={chip(viewMode === 'tunnel')}
          >
            <span className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-[0.14em] uppercase opacity-75">00</span>
              <span className="font-mono text-[11px] font-bold tracking-[0.14em] uppercase">Túnel de salida</span>
            </span>
            <span className="hidden font-mono text-[10px] tracking-[0.12em] uppercase opacity-70 lg:inline">Intro</span>
          </button>
        </li>
        <li className="contents">
          <button
            type="button"
            aria-pressed={viewMode === 'aerial' && activeId === null}
            onClick={onSelectAerial}
            className={chip(viewMode === 'aerial' && activeId === null)}
          >
            <span className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-[0.14em] uppercase opacity-75">3D</span>
              <span className="font-mono text-[11px] font-bold tracking-[0.14em] uppercase">Mapa Cenital</span>
            </span>
            <span className="hidden font-mono text-[10px] tracking-[0.12em] uppercase opacity-70 lg:inline">33 sectores</span>
          </button>
        </li>
        {SPOTS.map((s, i) => {
          const isSelected = activeId === s.id
          return (
            <li key={s.id} className="contents">
              <button type="button" aria-pressed={isSelected} onClick={() => onSelectSpot(s)} className={chip(isSelected)}>
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="font-mono text-[11px] tabular-nums opacity-70">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-bold whitespace-nowrap">{s.label}</span>
                  {s.note ? <span className="font-mono text-[10px] tracking-[0.14em] uppercase opacity-70">{s.note}</span> : null}
                </span>
                <span className="font-mono text-[11px] font-bold tabular-nums opacity-85">{s.priceLabel}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * La Bombonera en 3D con experiencia de ticketing interactiva estilo Reel:
 *  1. Túnel de salida de los jugadores ("ELEGÍ TU UBICACIÓN")
 *  2. Vuelo a la cancha y ascenso al Mapa Cenital 3D con 33 sectores iluminables
 *  3. Zoom frontal a las bandejas, suites terracota/oro y cintas LED de precios
 *  4. Vista POV detrás de los respaldos de tu butaca + emisión de Ticket físico 3D
 */
export function Bombonera() {
  const webgl = useWebGL2()
  const reduced = useReducedMotion()
  const stage = useRef(null)
  const sound = useRef(null)
  const [lost, setLost] = useState(false)
  const [spot, setSpot] = useState(null)
  const [viewMode, setViewMode] = useState('tunnel')
  const [topDown, setTopDown] = useState(true)
  const [lookMode, setLookMode] = useState('pitch')
  const [hover, setHover] = useState(null)
  const [visible, setVisible] = useState(true)
  const [audible, setAudible] = useState(false)
  const [ticketOpen, setTicketOpen] = useState(false)

  const three = webgl === true && !lost
  const plan = webgl === false || lost

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => sound.current?.setAerial(viewMode === 'aerial' || viewMode === 'tunnel'), [viewMode])
  useEffect(() => () => sound.current?.dispose(), [])

  const toggleSound = () => {
    sound.current ??= new CrowdSound()
    const on = !audible
    sound.current.setEnabled(on)
    sound.current.setAerial(viewMode === 'aerial' || viewMode === 'tunnel')
    setAudible(on)
  }

  // Clic en una tribuna o baliza de asiento en 3D
  const onPick = useCallback(
    (z) => {
      const nextSpot = {
        id: `tribuna:${z.sectionId}:${z.rowNumber}:${z.seatNumber}`,
        label: z.shortName || z.name,
        note: z.sectionCode,
        sectionId: z.sectionId,
        sectionCode: z.sectionCode,
        badge: z.badge,
        price: z.price,
        priceLabel: z.priceLabel,
        available: z.available,
        gate: z.gate,
        rowNumber: z.rowNumber,
        seatNumber: z.seatNumber,
        caption: `Fila ${String(z.rowNumber).padStart(2, '0')} · Butaca ${String(z.seatNumber).padStart(2, '0')} · ${z.gate}. Vista verificada desde las gradas de La Bombonera.`,
        seat: z.seat,
      }
      setSpot(nextSpot)
      setLookMode('pitch')
      // Si tocó una baliza individual o ya estaba en vista de sector, lo sienta directo en POV; si estaba en el mapa aéreo, acerca primero al sector (Stage 2 del Reel)
      setViewMode((prev) => (z.fromSeatBeacon || prev === 'section' || prev === 'seat' ? 'seat' : 'section'))
    },
    [],
  )

  const handleSelectListSpot = useCallback((s) => {
    setSpot(s)
    setLookMode('pitch')
    // Al elegir de la lista: si aún no estaba en ese sector, muestra la vista cercana de filas/suites o sienta directo al volver a tocar
    setViewMode((prev) => (prev === 'section' ? 'seat' : 'seat'))
  }, [])

  const handleCycleSeat = useCallback(
    (dir) => {
      if (!spot) return
      const sec = sectionById(spot.sectionId) || SECTIONS[0]
      const list = sec?.featuredSeats ?? []
      if (!list.length) return
      const curIdx = list.findIndex(
        (fs) => fs.rowNumber === spot.rowNumber && fs.seatNumber === spot.seatNumber,
      )
      const nextIdx = (curIdx === -1 ? 0 : curIdx + dir + list.length) % list.length
      const fs = list[nextIdx]
      setSpot((prev) => ({
        ...prev,
        id: fs.id,
        rowNumber: fs.rowNumber,
        seatNumber: fs.seatNumber,
        price: fs.price,
        priceLabel: fs.priceLabel,
        seat: fs,
      }))
    },
    [spot],
  )

  const onLost = useCallback(() => setLost(true), [])

  return (
    <main
      className="relative bg-fondo text-claro"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !ticketOpen) {
          if (viewMode === 'seat') {
            e.preventDefault()
            setViewMode('section')
          } else if (viewMode === 'section' || spot) {
            e.preventDefault()
            setSpot(null)
            setViewMode('aerial')
          }
        }
      }}
    >
      <section ref={stage} aria-labelledby="bombonera-title" className="relative h-dvh min-h-[38rem] overflow-hidden">
        {/* Resplandor nocturno de fondo mientras carga WebGL */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[#03050a] bg-[radial-gradient(65%_50%_at_50%_54%,rgba(120,150,230,0.14),transparent_72%)]"
        />
        {three ? (
          <StadiumCanvas
            seat={spot?.seat ?? null}
            viewMode={viewMode}
            topDown={topDown}
            lookMode={lookMode}
            activeSectionId={spot?.sectionId ?? null}
            active={visible}
            reduced={reduced}
            onPick={onPick}
            onHover={setHover}
            onLost={onLost}
          />
        ) : null}
        {plan ? (
          <div className="absolute inset-x-4 top-28 bottom-[15rem] sm:inset-x-8 lg:top-24 lg:right-[22rem] lg:bottom-48">
            <Plano
              spots={SPOTS}
              activeId={spot?.id ?? null}
              onSelect={(s) => {
                setSpot(s)
                setViewMode('seat')
              }}
            />
          </div>
        ) : null}

        {/* Viñeta oscura cinematográfica como en el mapa cenital del Reel */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_85%_at_50%_46%,transparent_52%,rgba(2,4,10,0.86)_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-fondo/95 via-fondo/45 to-transparent"
        />

        {/* Overlay central en el Túnel de Jugadores ("PICK YOUR SEAT" del Reel) */}
        {three && viewMode === 'tunnel' ? (
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center px-4">
            <div className="pointer-events-auto flex flex-col items-center text-center">
              <span className="rounded-full border border-oro/40 bg-[#050a18]/80 px-4 py-1 font-mono text-[10px] font-bold tracking-[0.24em] text-oro uppercase backdrop-blur-md">
                Estadio Alberto J. Armando · Ticketing 3D
              </span>
              <h2 className="text-shadow-scene mt-3 font-display text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.9] tracking-wide text-white uppercase">
                Elegí tu <span className="text-oro">ubicación</span>
              </h2>
              <p className="text-shadow-scene mt-2 max-w-md text-xs text-claro/85 sm:text-sm">
                Salí por el túnel a la cancha, recorré las 3 bandejas y los palcos en 3D y mirá el campo desde tu asiento antes de emitir tu entrada.
              </p>
              <button
                type="button"
                onClick={() => setViewMode('aerial')}
                className={`${focus} mt-5 inline-flex min-h-12 items-center gap-3 rounded-full bg-gradient-to-r from-[#dfa64b] via-[#f0c057] to-[#d69636] px-7 font-mono text-xs font-extrabold tracking-[0.18em] text-[#050914] uppercase shadow-[0_10px_35px_rgba(240,192,87,0.45)] transition-transform hover:scale-103 active:scale-97`}
              >
                <span>Salir a la cancha</span>
                <span aria-hidden="true" className="text-base leading-none">
                  →
                </span>
              </button>
            </div>
          </div>
        ) : null}

        <SectionHeader
          variant="overlay"
          wide
          className="z-20"
          title="La"
          accent="Bombonera"
          subtitle="Estadio Alberto J. Armando · Ticketing 3D"
          titleAs="h1"
          titleId="bombonera-title"
          end={
            three ? (
              <div className="pointer-events-auto flex flex-wrap items-center gap-2">
                {spot ? (
                  <button
                    type="button"
                    onClick={() => setTicketOpen(true)}
                    className={`${focus} eyebrow inline-flex min-h-10 items-center gap-2 rounded-full border border-oro bg-oro/15 px-4 text-oro transition-colors hover:bg-oro hover:text-fondo`}
                  >
                    Ver Ticket · {spot.priceLabel}
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-pressed={audible}
                  onClick={toggleSound}
                  className={`${focus} eyebrow inline-flex min-h-10 items-center gap-2 rounded-full border border-oro/35 bg-fondo/80 px-4 text-oro hover:border-oro aria-pressed:bg-oro aria-pressed:text-fondo`}
                >
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                  {audible ? 'Sonido encendido' : 'Sonido apagado'}
                </button>
              </div>
            ) : null
          }
        />

        {plan ? (
          <p className="absolute inset-x-4 top-[5.6rem] z-10 text-xs text-claro/60 sm:inset-x-8 lg:top-auto lg:right-[22rem] lg:bottom-10 lg:left-auto lg:max-w-xs lg:text-right">
            Tu navegador no muestra 3D (WebGL2), así que queda el plano visto desde arriba.
          </p>
        ) : null}

        <SectionHoverTooltip hover={hover} viewMode={viewMode} />
        <Caption spot={spot} hover={hover} viewMode={viewMode} three={three} />
        <Ubicaciones
          activeId={spot?.id ?? null}
          viewMode={viewMode}
          topDown={topDown}
          onSelectTunnel={() => {
            setSpot(null)
            setViewMode('tunnel')
          }}
          onSelectAerial={() => {
            setSpot(null)
            setViewMode('aerial')
          }}
          onSelectSpot={handleSelectListSpot}
          onToggleTopDown={() => setTopDown((v) => !v)}
        />
        <FloatingTicketPill
          spot={spot}
          viewMode={viewMode}
          lookMode={lookMode}
          onSetViewMode={setViewMode}
          onSetLookMode={setLookMode}
          onCycleSeat={handleCycleSeat}
          onOpenTicket={() => setTicketOpen(true)}
        />
      </section>

      <TicketModal open={ticketOpen} ticket={spot} onClose={() => setTicketOpen(false)} />

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
