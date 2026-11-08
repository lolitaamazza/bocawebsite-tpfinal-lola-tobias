'use client'

import { useEffect, useRef } from 'react'
import { paintBackPreview } from './kitPainter'

/**
 * Espalda de la remera en 2D. Se repinta cuando cambian nombre o número
 * (con un respiro de 80 ms para no repintar por cada tecla).
 */
export function JerseyPreview({ name, number, className = '', label }) {
  const canvas = useRef(null)
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = el.getBoundingClientRect()
    el.width = Math.round(rect.width * dpr)
    el.height = Math.round(rect.height * dpr)
    const t = setTimeout(() => paintBackPreview(el, name, number).catch(() => {}), 80)
    return () => clearTimeout(t)
  }, [name, number])
  return <canvas ref={canvas} role="img" aria-label={label ?? `Remera con ${name || 'tu nombre'} y el ${number || '12'}`} className={`block h-full w-full ${className}`} />
}
