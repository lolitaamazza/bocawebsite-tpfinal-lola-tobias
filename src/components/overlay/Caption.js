import { useEffect, useRef } from 'react'
import { playerById } from '../../data'
import { useVestuario } from '../../store/vestuario'
import { frameBus } from '../../three/frameBus'
/** Epígrafe bajo la remera señalada: dorsal, nombre, rol y de dónde vino */
export function Caption() {
  const el = useRef(null)
  const hover = useVestuario((s) => s.hover)
  const player = hover ? playerById(hover) : null
  useEffect(
    () =>
      frameBus.subscribe(({ caption }) => {
        if (el.current && caption)
          el.current.style.transform = `translate3d(${caption.x.toFixed(1)}px, ${caption.y.toFixed(1)}px, 0) translateX(-50%)`
      }),
    [],
  )
  return (
    <div
      ref={el}
      className={`text-shadow-scene pointer-events-none absolute top-0 left-0 z-10 text-center whitespace-nowrap transition-opacity duration-200 will-change-transform ${player ? 'opacity-100' : 'opacity-0'}`}
    >
      {player ? (
        <>
          <p className="text-base font-semibold tracking-tight md:text-sm">
            <span className="mr-1.5 font-display text-lg text-oro md:text-base">{player.dorsal}</span>
            {player.nombre} {player.apellido}
          </p>
          <p className="mt-0.5 font-mono text-[10px] tracking-[0.2em] text-claro/75 uppercase">
            {player.rol} · {player.procedencia}
          </p>
        </>
      ) : null}
    </div>
  )
}
