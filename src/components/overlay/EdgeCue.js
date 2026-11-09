'use client'

import { useEffect, useRef } from 'react'
import { useVestuario } from '../../store/vestuario'
import { frameBus } from '../../three/frameBus'

/**
 * Pista al llegar a la última remera: "Seguí bajando · Historia". También es un
 * botón, para quien no use rueda ni gestos.
 */
export function EdgeCue() {
  const el = useRef(null)
  useEffect(
    () =>
      frameBus.subscribe(({ atEnd }) => {
        const node = el.current
        if (!node) return
        node.style.opacity = atEnd ? '1' : '0'
        node.style.transform = `translate(-50%, ${atEnd ? 0 : 12}px)`
        node.style.pointerEvents = atEnd ? 'auto' : 'none'
        node.tabIndex = atEnd ? 0 : -1
      }),
    [],
  )
  return (
    <button
      ref={el}
      type="button"
      onClick={() => useVestuario.getState().setView('historia')}
      style={{ opacity: 0, transform: 'translate(-50%, 12px)', pointerEvents: 'none' }}
      className="absolute bottom-24 left-1/2 z-20 flex flex-col items-center gap-1 transition-[opacity,transform] duration-500"
    >
      <span className="eyebrow text-oro">Seguí bajando</span>
      <span className="font-serif text-2xl text-claro italic">Historia en la piel</span>
      <span className="animate-bounce text-oro" aria-hidden="true">
        ↓
      </span>
    </button>
  )
}
