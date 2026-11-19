'use client'

import { useEffect, useRef } from 'react'
import { renderCard } from './drawCarnet'
import styles from './carnet.module.css'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * El carnet en 3D: dos canvas (frente y dorso) en una tarjeta que se da vuelta, se
 * inclina con el mouse y tiene brillo holográfico. Con "reducir movimiento" no se
 * inclina y la vuelta es instantánea. En pantallas táctiles no se inclina (se scrollea).
 */
export function CarnetCard({ model, crest, photo, fontsReady, flipped, onFlip }) {
  const stage = useRef(null)
  const front = useRef(null)
  const back = useRef(null)
  const frame = useRef(0)

  // Redibuja las dos caras cuando cambia el diseño, la foto, el escudo o llegan las tipografías
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const assets = { crest, photo }
      if (front.current) renderCard(front.current, 'front', model, assets)
      if (back.current) renderCard(back.current, 'back', model, assets)
    })
    return () => cancelAnimationFrame(id)
  }, [model, crest, photo, fontsReady])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  function onPointerMove(e) {
    if (e.pointerType === 'touch' || reducedMotion()) return
    const el = stage.current
    const r = el.getBoundingClientRect()
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--ry', `${((px - 0.5) * 18).toFixed(2)}deg`)
      el.style.setProperty('--rx', `${((0.5 - py) * 14).toFixed(2)}deg`)
      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`)
      el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`)
      el.dataset.active = ''
    })
  }

  function onPointerLeave() {
    cancelAnimationFrame(frame.current)
    const el = stage.current
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    delete el.dataset.active
  }

  return (
    <div ref={stage} className={styles.stage} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div className={styles.tilt}>
        {/* El clic sobre el carnet es un atajo de mouse; el botón "Ver dorso" es el control accesible */}
        <div className={styles.flipper} data-flipped={flipped ? 'true' : 'false'} onClick={onFlip}>
          <div className={styles.face} aria-hidden={flipped}>
            <canvas ref={front} className={styles.canvas} width={1712} height={1080} role="img" aria-label={model.ariaFront} />
            <div className={styles.sheen} />
          </div>
          <div className={`${styles.face} ${styles.back}`} aria-hidden={!flipped}>
            <canvas ref={back} className={styles.canvas} width={1712} height={1080} role="img" aria-label={model.ariaBack} />
            <div className={styles.sheen} />
          </div>
        </div>
      </div>
    </div>
  )
}
