'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Stage } from '@/components/three/Stage'
import { jerseyAsPlayer } from '@/lib/domain/jerseys'
import { loadSceneAssets } from '@/three/assets'
import { frameBus } from '@/three/frameBus'

const isMobile = () => innerWidth < 820 || matchMedia('(pointer: coarse)').matches

/**
 * Vestuario personal: las remeras del usuario colgadas en el mismo riel 3D que el
 * plantel. Pasar el puntero muestra el epígrafe; clic lleva a editar esa remera.
 */
export function PersonalRack({ jerseys }) {
  const router = useRouter()
  const [assets, setAssets] = useState(null)
  const [error, setError] = useState(null)
  const [hover, setHover] = useState(null)
  const [mobile] = useState(isMobile)
  const caption = useRef(null)
  const players = useMemo(() => jerseys.map(jerseyAsPlayer), [jerseys])
  const hovered = jerseys.find((j) => j.id === hover)

  useEffect(() => {
    let alive = true
    loadSceneAssets()
      .then((a) => alive && setAssets(a))
      .catch(() => alive && setError('No pudimos cargar el vestuario 3D.'))
    return () => {
      alive = false
    }
  }, [])

  useEffect(
    () =>
      frameBus.subscribe(({ caption: c }) => {
        if (caption.current && c) caption.current.style.transform = `translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0) translateX(-50%)`
      }),
    [],
  )

  if (error) return <p className="rounded-xl border border-red-400/30 p-4 text-red-200">{error}</p>

  return (
    <div className="relative h-[min(72dvh,640px)] overflow-hidden rounded-3xl border border-white/10 bg-fondo">
      {assets ? (
        <Stage
          assets={assets}
          mobile={mobile}
          players={players}
          bindStore={false}
          onHover={setHover}
          onSelect={(id) => router.push(`/mis-remeras/${id}`)}
          label="Tus remeras colgadas en 3D. Clic en una para editarla."
        />
      ) : (
        <div className="grid h-full place-items-center">
          <p className="eyebrow animate-pulse text-claro/50">Colgando tus remeras…</p>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_45%,transparent_55%,rgba(2,4,10,0.82)_100%)]" />
      <div
        ref={caption}
        className={`text-shadow-scene pointer-events-none absolute top-0 left-0 z-10 text-center whitespace-nowrap transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}
      >
        {hovered ? (
          <>
            <p className="font-dorsal text-lg tracking-[0.06em]">
              {hovered.name} <span className="text-oro">{hovered.number}</span>
            </p>
            <p className="eyebrow text-claro/75">Talle {hovered.size} · clic para editar</p>
          </>
        ) : null}
      </div>
    </div>
  )
}
