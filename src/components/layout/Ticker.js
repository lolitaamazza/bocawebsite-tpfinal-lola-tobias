import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef } from 'react'
/**
 * Cinta corrida del pie. Dos copias iguales en fila; GSAP desplaza la tira
 * exactamente el ancho de una copia y repite, así el salto no se ve.
 */
export function Ticker({ items }) {
  const track = useRef(null)
  useGSAP(
    () => {
      const el = track.current
      if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const half = el.scrollWidth / 2
      gsap.fromTo(el, { x: 0 }, { x: -half, duration: half / 38, ease: 'none', repeat: -1 })
    },
    { dependencies: [items.join('|')] },
  )
  const row = items.map((t) => (
    <span key={t} className="flex shrink-0 items-center gap-6 pr-6">
      <span>{t}</span>
      <span className="h-1 w-1 rounded-full bg-oro" />
    </span>
  ))
  return (
    <div aria-hidden="true" className="overflow-hidden border-t border-oro/25 bg-azul py-1.5">
      <div ref={track} className="eyebrow flex w-max text-claro/85 will-change-transform">
        <div className="flex">{row}</div>
        <div className="flex">{row}</div>
      </div>
    </div>
  )
}
