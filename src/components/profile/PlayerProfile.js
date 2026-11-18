'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import Image from 'next/image'
import { forwardRef, useRef } from 'react'
import { portraitUrl, stats as statsFile } from '../../data'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'
import { RING_LENGTH, RingStat } from '../ui/RingStat'
import { Figure, ProfileSection, fmt } from './ProfileSection'

const fetched = new Date(`${statsFile.meta.fetched}T12:00:00`).toLocaleDateString('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Cuenta números, dibuja anillos y llena la barra, todo desde 0, en la línea de tiempo `tl` */
function playFigures(root, tl, duration, at) {
  for (const el of root.querySelectorAll('[data-count]')) {
    const node = el.firstChild
    if (!node) continue
    const o = { v: 0 }
    node.nodeValue = fmt(0)
    tl.to(o, { v: Number(el.dataset.count), duration, ease: 'power2.out', onUpdate: () => void (node.nodeValue = fmt(o.v)) }, at)
  }
  tl.fromTo(
    root.querySelectorAll('[data-ring]'),
    { attr: { 'stroke-dashoffset': RING_LENGTH } },
    { attr: { 'stroke-dashoffset': (_, c) => Number(c.dataset.offset) }, duration, ease: 'power2.out' },
    at,
  )
  tl.fromTo(root.querySelectorAll('[data-bar]'), { scaleX: 0 }, { scaleX: 1, duration, ease: 'power2.out' }, at)
}
/** Estado final de números, anillos y barra (movimiento reducido o animación cortada) */
function settleFigures(root) {
  for (const el of root.querySelectorAll('[data-count]')) if (el.firstChild) el.firstChild.nodeValue = fmt(Number(el.dataset.count))
  for (const c of root.querySelectorAll('[data-ring]')) c.setAttribute('stroke-dashoffset', c.dataset.offset)
  gsap.set(root.querySelectorAll('[data-bar]'), { scaleX: 1 })
}

/**
 * Perfil a pantalla completa del jugador seleccionado. La remera 3D cuelga en el
 * hueco central (data-stage-slot): esta capa no tiene fondo opaco.
 * Ancho y apaisado: texto | remera | anillos. Vertical: nombre, remera, panel compacto.
 */
export const PlayerProfile = forwardRef(function PlayerProfile(
  { open, player: p, metrics: m, more, onMore, onClose, onCustomize, onShare, onPrev, onNext, onSwipe },
  slotRef,
) {
  const root = useRef(null)
  const touch = useRef(null)
  const was = useRef({ open: false, id: null })
  const tl = useRef(null)
  const id = p?.id ?? null

  useGSAP(
    () => {
      const el = root.current
      if (!el) return
      const prev = was.current
      was.current = { open, id }
      const q = gsap.utils.selector(el)
      const parts = () => [q('[data-p-scrim]'), q('[data-p-name]'), q('[data-p-badge]'), q('[data-p-panel]'), q('[data-p-item]'), q('[data-p-side]'), q('[data-p-swap]')].flat()
      const reduce = reducedMotion()
      if (open && !prev.open) {
        // Entrada: nombre desde la izquierda, insignia, panel y sus bloques, anillos
        tl.current?.kill()
        gsap.set(el, { visibility: 'visible', opacity: 1 })
        if (reduce) {
          gsap.set(parts(), { opacity: 1, x: 0, y: 0, scale: 1 })
          settleFigures(el)
          return
        }
        const t = gsap.timeline()
        tl.current = t
        t.fromTo(q('[data-p-scrim]'), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.out' }, 0)
          .fromTo(q('[data-p-name]'), { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' }, 0.1)
          .fromTo(q('[data-p-badge]'), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 0.3)
          .fromTo(q('[data-p-panel]'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }, 0.35)
          .fromTo(q('[data-p-item]'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out' }, 0.45)
          .fromTo(q('[data-p-side]'), { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, 0.45)
        playFigures(el, t, 1, 0.6)
      } else if (open && prev.open && id !== prev.id) {
        // Anterior/siguiente: la capa queda, el contenido se cruza y los números vuelven a contar
        tl.current?.kill()
        gsap.set(parts(), { opacity: 1, x: 0, y: 0, scale: 1 })
        if (reduce) return void settleFigures(el)
        const t = gsap.timeline()
        tl.current = t
        t.fromTo(q('[data-p-swap]'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.03, ease: 'power2.out' }, 0)
        playFigures(el, t, 0.7, 0.05)
      } else if (!open && prev.open) {
        tl.current?.kill()
        const hide = () => void gsap.set(el, { visibility: 'hidden' })
        if (reduce) {
          gsap.set(el, { opacity: 0 })
          return hide()
        }
        const t = gsap.timeline({ onComplete: hide })
        tl.current = t
        t.to(el, { opacity: 0, duration: 0.35, ease: 'power2.in' }, 0)
          .to(q('[data-p-name]'), { x: -24, duration: 0.35, ease: 'power2.in' }, 0)
          .to(q('[data-p-panel]'), { y: 16, duration: 0.35, ease: 'power2.in' }, 0)
      }
    },
    { dependencies: [open, id] },
  )

  // Gestos en móvil: arriba = más datos, abajo = menos o cerrar, costados = anterior/siguiente
  const start = (e) => {
    touch.current = e.target.closest('input, a, button, label') ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const end = (e) => {
    if (!touch.current || !onSwipe) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    if (dy < -50 && -dy > Math.abs(dx) * 1.5) onSwipe('up')
    else if (dy > 70 && dy > Math.abs(dx) * 1.5) onSwipe('down')
    else if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 'left' : 'right')
  }

  const extra = more ? 'block' : 'hidden wide:block'
  return (
    <section
      ref={root}
      aria-live="polite"
      aria-label={p ? `Perfil de ${p.nombre} ${p.apellido}` : undefined}
      inert={!open}
      onTouchStart={start}
      onTouchEnd={end}
      className="invisible pointer-events-none absolute inset-0 z-30 opacity-0"
    >
      {/* Velo para leer sobre la escena: solo detrás del texto, nunca sobre el hueco de la remera */}
      <div data-p-scrim aria-hidden="true" className="absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[30%] bg-gradient-to-b from-fondo/80 to-transparent wide:hidden" />
        <div className="absolute inset-y-0 left-0 hidden w-[min(860px,60vw)] bg-gradient-to-r from-fondo/85 from-30% via-fondo/50 to-transparent wide:block" />
        <div className="absolute inset-y-0 left-0 hidden w-[min(700px,48vw)] bg-[radial-gradient(70%_55%_at_35%_55%,rgba(43,79,196,0.22),transparent_70%)] wide:block" />
      </div>

      {p && m ? (
        <div className="relative flex h-full min-h-0 flex-col px-4 pt-[calc(max(0.75rem,env(safe-area-inset-top))+3.85rem)] pb-[calc(2.75rem+env(safe-area-inset-bottom))] wide:grid wide:grid-cols-[min(560px,44vw)_minmax(0,1fr)_150px] wide:grid-rows-[auto_minmax(0,1fr)] wide:gap-x-[3vw] wide:pt-[7.25rem] wide:pr-[max(2rem,env(safe-area-inset-right))] wide:pb-[5.5rem] wide:pl-[max(2rem,env(safe-area-inset-left))]">
          {/* Posición, país, nombre e insignia con el retrato */}
          <div data-p-name data-p-swap className="pointer-events-auto relative shrink-0 wide:col-start-1 wide:row-start-1">
            <div className="flex flex-wrap items-center gap-2 pr-12 wide:pr-0">
              <span className="eyebrow rounded bg-azul-vivo px-2 py-1 text-[9px] leading-none text-claro">{p.rol}</span>
              {p.capitan ? (
                <span className="eyebrow rounded border border-oro/70 px-2 py-[3px] text-[9px] leading-none text-oro">Capitán</span>
              ) : null}
              <span className="text-[13px] text-claro/75">
                <span className="mr-1.5" aria-hidden="true">
                  {p.bandera}
                </span>
                {p.pais}
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-4 wide:mt-4 wide:gap-6">
              <h2 className="min-w-0 leading-none">
                <span className="block text-lg text-claro/80 wide:text-[clamp(1.1rem,1.5vw,1.45rem)]">{p.nombre}</span>
                <span className="mt-1 block font-display text-[clamp(2.4rem,11vw,3.4rem)] leading-[0.92] tracking-[0.01em] break-words uppercase wide:text-[clamp(3rem,4.8vw,4.9rem)]">
                  {p.apellido}
                </span>
              </h2>
              <div data-p-badge data-p-swap className="relative shrink-0">
                <div className="h-16 w-16 overflow-hidden rounded-full border border-oro/50 bg-azul/40 shadow-[0_0_0_6px_rgba(43,79,196,0.18)] wide:h-24 wide:w-24">
                  <Image
                    src={portraitUrl(p)}
                    alt={`Retrato de ${p.nombre} ${p.apellido}`}
                    width={300}
                    height={390}
                    sizes="96px"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <span className="absolute -right-1.5 -bottom-1 rounded-full bg-oro px-2 py-0.5 font-dorsal text-sm leading-none font-bold text-fondo shadow-md shadow-black/40 wide:text-base">
                  {p.dorsal}
                </span>
              </div>
            </div>
            <IconButton icon="close" label="Cerrar" onClick={onClose} className="absolute top-0 right-0 bg-fondo/40 wide:hidden" />
          </div>

          {/* Acá cuelga la remera 3D: useStageRect mide este rectángulo */}
          <div
            ref={slotRef}
            data-stage-slot
            aria-hidden="true"
            className={`pointer-events-none flex-1 ${more ? 'min-h-[20vh]' : 'min-h-[34vh]'} wide:col-start-2 wide:row-span-2 wide:row-start-1 wide:min-h-0`}
          />

          {/* Panel de vidrio con los datos */}
          <div
            data-p-panel
            className="pointer-events-auto flex min-h-0 shrink-0 flex-col rounded-2xl border border-white/12 bg-fondo/60 shadow-2xl shadow-black/50 backdrop-blur-xl wide:col-start-1 wide:row-start-2 wide:mt-6 wide:max-h-full wide:shrink wide:self-start wide:bg-white/[0.06]"
          >
            <div className="scrollbar-none max-h-[36dvh] space-y-2 overflow-y-auto overscroll-contain px-3 pt-3 wide:grid wide:max-h-none wide:grid-cols-2 wide:gap-3 wide:space-y-0 wide:p-4">
              <ProfileSection label={statsFile.meta.competition} className="wide:col-start-2 wide:row-start-1">
                <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_auto_auto] items-start gap-2 wide:grid-cols-3 wide:gap-3">
                  <Figure value={m.minutes} label="Minutos" />
                  <Figure value={m.played} label="Partidos" />
                  <Figure value={m.third.value} label={m.third.label} />
                  <RingStat size="sm" value={m.starterRate} label="Titular" className="wide:hidden" />
                  <RingStat size="sm" value={m.minutesShare} label="Minutos" className="wide:hidden" />
                </div>
              </ProfileSection>

              <ProfileSection label="Aporte y disciplina" className={`${extra} wide:col-start-1 wide:row-start-1`}>
                <div className="grid grid-cols-3 gap-3">
                  <Figure value={m.assists} label="Asistencias" />
                  <Figure value={m.yellow} label="Amarillas" lead={<span className="mr-2 h-5 w-3.5 shrink-0 rounded-[3px] bg-yellow-400 shadow shadow-black/40" />} />
                  <Figure value={m.red} label="Rojas" lead={<span className="mr-2 h-5 w-3.5 shrink-0 rounded-[3px] bg-red-600 shadow shadow-black/40" />} />
                </div>
              </ProfileSection>

              <ProfileSection label="Minutos en el torneo" className={`${extra} wide:col-start-1 wide:row-start-2`}>
                <p className="font-display text-[1.6rem] leading-none wide:text-[clamp(1.6rem,2.1vw,2rem)]">
                  {m.minutes !== null ? <span data-count={m.minutes}>{fmt(m.minutes)}</span> : '–'}
                  <span className="ml-1.5 font-sans text-xs text-claro/55">de {fmt(m.minutesCap)} min</span>
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    data-bar
                    className="h-full origin-left rounded-full bg-oro"
                    style={{ width: `${m.minutesShare ?? 0}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-claro/55 wide:text-[11px]">de {m.teamMatches} partidos del equipo</p>
              </ProfileSection>

              <ProfileSection label="El jugador" className={`${extra} wide:col-start-2 wide:row-start-2`}>
                <div className="grid grid-cols-3 gap-3">
                  <Figure value={m.age} unit="años" label="Edad" />
                  <Figure value={m.starts} label="Titular" />
                  <Figure value={m.contract ?? '—'} count={false} label="Contrato" />
                </div>
              </ProfileSection>

              <ProfileSection label="Llegó de" className={`${extra} wide:col-span-2 wide:row-start-3`}>
                <dl className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <dd className="truncate text-sm font-semibold wide:text-base">{p.procedencia}</dd>
                    <dt className="mt-1 text-[10px] text-claro/55 wide:text-[11px]">Club anterior</dt>
                  </div>
                  <div className="min-w-0">
                    <dd className="truncate text-sm font-semibold wide:text-base">
                      <span className="mr-1.5" aria-hidden="true">
                        {p.bandera}
                      </span>
                      {p.pais}
                    </dd>
                    <dt className="mt-1 text-[10px] text-claro/55 wide:text-[11px]">Nacionalidad</dt>
                  </div>
                </dl>
              </ProfileSection>
            </div>

            <div data-p-item className="shrink-0 px-3 pt-2 pb-3 wide:px-4 wide:pt-0 wide:pb-4">
              <button
                type="button"
                onClick={onMore}
                aria-expanded={more}
                className="eyebrow flex w-full items-center justify-between py-1.5 text-claro/60 hover:text-claro wide:hidden"
              >
                {more ? 'Menos datos' : 'Más datos'}
                <Icon name="more" className={`h-3.5 w-3.5 transition-transform duration-300 ${more ? 'rotate-180' : ''}`} />
              </button>
              <p className="mt-1.5 font-mono text-[8px] tracking-[0.18em] text-claro/40 uppercase wide:mt-0">
                {statsFile.meta.competition} · {statsFile.meta.source} · {fetched}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCustomize}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-oro px-5 font-mono text-[11px] font-semibold tracking-[0.16em] text-fondo uppercase shadow-lg shadow-black/40 transition-[filter,transform] hover:brightness-110 active:scale-[0.98] wide:flex-none"
                >
                  <Icon name="pencil" className="h-3.5 w-3.5" />
                  Con mi nombre
                </button>
                <IconButton icon="share" label="Compartir perfil" onClick={onShare} />
                <IconButton icon="prev" label="Jugador anterior" onClick={onPrev} className="wide:hidden" />
                <IconButton icon="next" label="Jugador siguiente" onClick={onNext} className="wide:hidden" />
              </div>
            </div>
          </div>

          {/* Columna derecha: cerrar, anterior/siguiente y los dos anillos */}
          <div
            data-p-side
            className="pointer-events-auto hidden wide:col-start-3 wide:row-span-2 wide:row-start-1 wide:flex wide:min-h-0 wide:flex-col wide:items-center"
          >
            <div className="flex flex-col items-center gap-2.5">
              <IconButton icon="close" label="Cerrar" onClick={onClose} className="mb-3 bg-fondo/40" />
              <IconButton icon="prev" label="Jugador anterior" onClick={onPrev} className="bg-fondo/30" />
              <IconButton icon="next" label="Jugador siguiente" onClick={onNext} className="bg-fondo/30" />
            </div>
            <div data-p-swap className="my-auto flex flex-col items-center gap-[4vh] py-4">
              <RingStat value={m.starterRate} label="Titularidad" />
              <RingStat value={m.minutesShare} label="Minutos disputados" />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
})
