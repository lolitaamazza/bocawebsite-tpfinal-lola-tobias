'use client'

import gsap from 'gsap'
import { useEffect, useRef } from 'react'

/**
 * Barra de 20 s (GSAP, lineal). El tiempo sale del reloj de pared: si la pestaña
 * queda en segundo plano y GSAP se frena, al volver se re-sincroniza, porque el
 * servidor sigue contando igual. Al dejar de correr (respuesta enviada) se congela
 * donde quedó. Avisa por lector de pantalla a los 10 y a los 5 segundos.
 */
export function TimerBar({ limitMs, remainingMs, running, onTimeout }) {
  const bar = useRef(null)
  const label = useRef(null)
  const live = useRef(null)
  const timeoutRef = useRef(onTimeout)
  useEffect(() => {
    timeoutRef.current = onTimeout
  }, [onTimeout])

  useEffect(() => {
    if (!running || !bar.current) return
    const start = performance.now()
    const total = Math.max(0, remainingMs)
    const said = new Set()
    const paint = () => {
      const left = Math.max(0, total - (performance.now() - start))
      const secs = Math.ceil(left / 1000)
      if (label.current) label.current.textContent = String(secs)
      if (bar.current) bar.current.dataset.urgent = String(left <= 5_000)
      for (const mark of [10, 5]) {
        if (secs === mark && !said.has(mark) && live.current) {
          said.add(mark)
          live.current.textContent = `Quedan ${mark} segundos`
        }
      }
    }
    const tween = gsap.fromTo(bar.current, { scaleX: total / limitMs }, { scaleX: 0, duration: total / 1000, ease: 'none', onUpdate: paint })
    paint()
    const timer = setTimeout(() => timeoutRef.current?.(), total)
    const resync = () => {
      if (document.visibilityState === 'visible' && total > 0) {
        tween.progress(Math.min(1, (performance.now() - start) / total))
        paint()
      }
    }
    document.addEventListener('visibilitychange', resync)
    return () => {
      tween.pause()
      paint()
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', resync)
    }
  }, [running, remainingMs, limitMs])

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div
          ref={bar}
          className="h-full origin-left rounded-full bg-oro transition-colors duration-300 data-[urgent=true]:bg-red-400"
          style={{ transform: `scaleX(${remainingMs / limitMs})` }}
        />
      </div>
      <p className="w-14 text-right font-mono text-sm tabular-nums text-claro/80">
        <span ref={label}>{Math.ceil(remainingMs / 1000)}</span>
        <span className="text-claro/40"> s</span>
      </p>
      <p ref={live} className="sr-only" aria-live="polite" />
    </div>
  )
}
