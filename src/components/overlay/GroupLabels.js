import { useEffect, useRef } from 'react'
import { positions } from '../../config/site'
import { squad } from '../../data'
import { frameBus } from '../../three/frameBus'
/** Rótulos de cada línea ("Arqueros 3") anclados al riel. Se mueven por frame, directo en el DOM. */
export function GroupLabels() {
  const wrap = useRef(null)
  const refs = useRef(new Map())
  useEffect(
    () =>
      frameBus.subscribe(({ groups, stage }) => {
        if (wrap.current) wrap.current.style.opacity = stage ? '0' : '1'
        for (const [pos, el] of refs.current) {
          const g = groups.find((g) => g.pos === pos)
          el.style.opacity = g?.visible ? '1' : '0'
          if (g) el.style.transform = `translate3d(${g.x.toFixed(1)}px, ${g.y.toFixed(1)}px, 0) translateY(-100%)`
        }
      }),
    [],
  )
  return (
    <div ref={wrap} className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-500">
      {positions.map((p) => (
        <div
          key={p.key}
          ref={(el) => void (el ? refs.current.set(p.key, el) : refs.current.delete(p.key))}
          className="text-shadow-scene absolute top-0 left-0 flex items-baseline gap-2 whitespace-nowrap opacity-0 transition-opacity duration-300 will-change-transform"
        >
          <span className="h-px w-5 self-center bg-oro" />
          <span className="font-mono text-[10px] font-semibold tracking-[0.28em] text-claro uppercase">{p.label}</span>
          <span className="font-mono text-[10px] font-semibold text-oro">{squad.filter((s) => s.pos === p.key).length}</span>
        </div>
      ))}
    </div>
  )
}
