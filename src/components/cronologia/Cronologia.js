'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { camisetaId, camisetas, perchasHistoricas } from '@/data/cronologia'
import { frameBus } from '@/three/frameBus'
import { SiteMenu } from '@/components/layout/SiteMenu'
import { loadHistoricRail } from './railAssets'

const Stage = dynamic(() => import('@/components/three/Stage').then((m) => m.Stage), { ssr: false })
const railOptions = { withCustom: false, gap: 0.32, centreEnds: true, showFront: true }
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oro'
const byId = new Map(camisetas.map((item) => [item.id, item]))

export function Cronologia() {
  const root = useRef(null)
  const card = useRef(null)
  const caption = useRef(null)
  const [assets, setAssets] = useState(null)
  const [rig, setRig] = useState(null)
  const [mobile, setMobile] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState(null)
  const [centre, setCentre] = useState(camisetas[0].id)
  const [hover, setHover] = useState(null)
  const item = byId.get(selected ?? centre)
  const hovered = byId.get(hover)

  useEffect(() => {
    let alive = true
    let loaded
    const sync = () => setSelected(camisetaId(window.location.hash))
    const start = async () => {
      sync()
      setMobile(innerWidth < 820 || matchMedia('(pointer: coarse)').matches)
      try {
        const gl = document.createElement('canvas').getContext('webgl2')
        if (!gl) {
          setError(true)
          return
        }
        loaded = await loadHistoricRail()
        if (alive) setAssets(loaded)
        else loaded.dispose()
      } catch (cause) {
        if (!alive) return
        console.error('No se pudo cargar el riel histórico.', cause)
        setError(true)
      }
    }
    void start()
    addEventListener('hashchange', sync)
    return () => {
      alive = false
      loaded?.dispose()
      removeEventListener('hashchange', sync)
    }
  }, [])

  const select = useCallback((id) => {
    if (id === camisetaId(window.location.hash)) return
    window.history.pushState(null, '', id ? `#camiseta-${id}` : window.location.pathname + window.location.search)
    setSelected(id)
  }, [])
  const markReady = useCallback(() => setReady(true), [])
  const markError = useCallback(() => setError(true), [])

  useEffect(() => {
    if (!rig) return
    rig.select(selected)
    if (selected) rig.onSkipIntro()
  }, [rig, selected])

  useEffect(() => {
    if (!rig) return
    const canvas = rig.canvas
    canvas.addEventListener('webglcontextlost', markError)
    return () => canvas.removeEventListener('webglcontextlost', markError)
  }, [rig, markError])

  useEffect(() => {
    if (!rig || !selected || !card.current || !root.current) return
    const element = root.current
    const panel = card.current
    const update = () => {
      const box = panel.getBoundingClientRect()
      const wide = matchMedia('(min-width: 900px) and (orientation: landscape)').matches
      rig.setStageRect(wide
        ? { x0: 0.025, x1: box.left / element.clientWidth, y0: 0.18, y1: 0.84, tuck: 0 }
        : { x0: 0.03, x1: 0.97, y0: 0.16, y1: box.top / element.clientHeight, tuck: 0 })
    }
    const observer = new ResizeObserver(update)
    observer.observe(element)
    observer.observe(panel)
    update()
    return () => observer.disconnect()
  }, [rig, selected])

  useEffect(() => frameBus.subscribe(({ caption: point }) => {
    if (point && caption.current)
      caption.current.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translateX(-50%)`
  }), [])

  const step = (direction) => {
    const index = camisetas.indexOf(item)
    const next = camisetas[Math.max(0, Math.min(index + direction, camisetas.length - 1))]
    if (next === item) return
    if (selected || error) select(next.id)
    else rig?.focus(next.id)
  }

  const keyboard = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'Escape' && selected) {
      event.preventDefault()
      select(null)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      step(event.key === 'ArrowLeft' ? -1 : 1)
    } else if (event.key === 'Enter' && !event.target.closest('button, a') && !selected) {
      event.preventDefault()
      select(hover ?? centre)
    }
  }

  return (
    <main ref={root} onKeyDown={keyboard} className="grain fixed inset-0 isolate overflow-hidden bg-fondo">
      {assets && !error && (
        <Stage
          assets={assets}
          mobile={mobile}
          players={perchasHistoricas}
          railOptions={railOptions}
          bindStore={false}
          onRig={setRig}
          onReady={markReady}
          onCentre={setCentre}
          onHover={setHover}
          onSelect={select}
          label="Riel de camisetas históricas en 3D. Arrastrá o usá las flechas para recorrerlo. Enter abre la ficha."
        />
      )}
      {!ready && !error && (
        <p role="status" className="pointer-events-none absolute inset-0 grid place-items-center font-mono text-sm text-oro">
          Colgando las camisetas…
        </p>
      )}
      {error && (
        <figure className="absolute inset-x-4 top-[19%] bottom-[48%] min-[900px]:inset-x-[7%] min-[900px]:right-[46%] min-[900px]:bottom-[22%]">
          <Image src={item.image} alt={`Foto de archivo de la camiseta de ${item.year}`} fill loading="eager" sizes="(min-width: 900px) 47vw, 92vw" className="object-contain" />
        </figure>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_45%,transparent_55%,rgba(2,4,10,0.82)_100%)]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 grid grid-cols-2 items-start gap-x-4 gap-y-2 bg-gradient-to-b from-fondo via-fondo/85 to-transparent px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-7 sm:px-8 md:grid-cols-[1fr_auto_1fr] md:pt-5">
        <SiteMenu className="col-start-1 row-start-1 justify-self-start" />
        <h1 className="col-span-2 row-start-2 text-center font-display text-[clamp(1.65rem,4vw,3.6rem)] leading-none uppercase md:col-span-1 md:col-start-2 md:row-start-1">
          Cronología de <span className="text-oro">camisetas</span>
        </h1>
        <Link href="/museo" className={`${focus} pointer-events-auto col-start-2 row-start-1 w-fit justify-self-end py-2 font-mono text-xs text-claro/80 hover:text-oro md:col-start-3`}>Museo ↗</Link>
      </header>

      <div ref={caption} aria-hidden="true" className="text-shadow-scene pointer-events-none absolute top-0 left-0 z-10 whitespace-nowrap font-mono text-sm text-oro">
        {!selected && !error && hovered ? hovered.year : null}
      </div>

      {(selected || error) && (
        <article
          ref={card}
          aria-labelledby="camiseta-titulo"
          className="absolute inset-x-3 bottom-[8.35rem] z-20 max-h-[33dvh] overflow-y-auto border border-oro/30 bg-fondo/95 p-4 shadow-2xl backdrop-blur-md min-[900px]:landscape:inset-x-auto min-[900px]:landscape:right-[4%] min-[900px]:landscape:bottom-auto min-[900px]:landscape:top-[23%] min-[900px]:landscape:max-h-[55dvh] min-[900px]:landscape:w-[min(39%,32rem)] min-[900px]:landscape:p-7"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-xs text-oro">{item.year} / {item.season}</p>
            {!error && <button type="button" aria-label="Cerrar ficha" onClick={() => select(null)} className={`${focus} -mt-1 grid size-8 shrink-0 place-items-center text-xl leading-none text-oro hover:bg-oro/10`}>×</button>}
          </div>
          <h2 id="camiseta-titulo" className="mt-1 font-display text-[clamp(1.65rem,3vw,3.15rem)] leading-none uppercase">{item.title}</h2>
          <p className="mt-2.5 max-w-[43ch] text-sm leading-relaxed text-claro/85 md:text-base">{item.description}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-oro">
            <a href={item.image} target="_blank" rel="noreferrer" className={`${focus} underline underline-offset-4`}>Foto de archivo ↗</a>
            <a href={item.imageSource} target="_blank" rel="noreferrer" className={`${focus} underline underline-offset-4`}>Fuente del club ↗</a>
          </div>
        </article>
      )}

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-fondo via-fondo/95 to-transparent px-3 pt-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8">
        <p className="mb-3 text-center font-mono text-[10px] tracking-wide text-claro/80 sm:text-xs">
          {error ? 'Fotos de archivo' : selected ? 'Arrastrá la camiseta para girarla' : 'Arrastrá el riel · Elegí una camiseta'}
        </p>
        <nav aria-label="Línea de tiempo de camisetas" className="pointer-events-auto mx-auto max-w-5xl">
          <ol className="grid grid-cols-5 gap-y-2 sm:grid-cols-10">
            {camisetas.map((shirt) => (
              <li key={shirt.id} className="min-w-0 border-t border-oro/45">
                <button
                  type="button"
                  aria-current={shirt.id === item.id ? 'true' : undefined}
                  aria-label={`${shirt.year}, ${shirt.title}`}
                  onClick={() => select(shirt.id)}
                  className={`${focus} group relative flex min-h-9 w-full items-center justify-center font-mono text-[clamp(0.62rem,1vw,0.85rem)] tabular-nums hover:text-oro ${shirt.id === item.id ? 'bg-oro/10 text-oro' : 'text-claro/70'}`}
                >
                  <span aria-hidden="true" className={`absolute -top-1 size-2 rounded-full border border-oro ${shirt.id === item.id ? 'bg-oro' : 'bg-fondo group-hover:bg-oro'}`} />
                  {shirt.year}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </footer>
    </main>
  )
}
