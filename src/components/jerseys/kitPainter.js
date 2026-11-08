'use client'

import { fonts } from '@/config/site'
import { loadBrand } from '@/three/kit/brand'
import { kit } from '@/three/kit/kitSpec'
import { paintBase, paintJersey } from '@/three/kit/paintKit'
import { TEMPLATE_H, TEMPLATE_W, worldToTemplate } from '@/three/kit/uvMap'
import { faceOutline } from '@/three/model/shirtGeometry'

/**
 * Pintor 2D de la espalda de la remera para las vistas previas (listas, formularios).
 * Usa exactamente el mismo pintado que la textura 3D y lo recorta con la silueta
 * del modelo, así la previa y la remera colgada son la misma remera.
 */
let ready = null
const bases = new Map()

function load() {
  ready ??= Promise.all([
    loadBrand(kit.colors),
    document.fonts.load(`${fonts.letteringWeight} 64px "${fonts.lettering}"`, 'ÁÉÍÓÚÑ0123456789'),
  ]).then(([brand]) => brand)
  return ready
}

/** Silueta de la espalda en px de plantilla (para recortar) */
const backPath = (() => {
  let cached = null
  return () => {
    if (cached) return cached
    const pts = faceOutline('back').flatMap((s) => s.pts)
    cached = pts.map(([x, y]) => worldToTemplate('back', x, y))
    return cached
  }
})()

/** Recuadro de la espalda dentro de la plantilla, con un poco de aire */
export const PREVIEW_BOX = { x: 0, y: 0, w: TEMPLATE_W, h: TEMPLATE_H }

/**
 * Dibuja la espalda con `name` y `number` en el canvas dado (tamaño en px CSS × dpr).
 * Resuelve cuando terminó; si el canvas ya no está en pantalla no pasa nada.
 */
export async function paintBackPreview(canvas, name, number) {
  const brand = await load()
  const k = 0.75
  let base = bases.get(k)
  if (!base) {
    base = paintBase(brand, k)
    bases.set(k, base)
  }
  const atlas = paintJersey(base, name || 'TU NOMBRE', number || '12', k)
  const ctx = canvas.getContext('2d')
  const scale = Math.min(canvas.width / TEMPLATE_W, canvas.height / TEMPLATE_H)
  const ox = (canvas.width - TEMPLATE_W * scale) / 2
  const oy = (canvas.height - TEMPLATE_H * scale) / 2
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.translate(ox, oy)
  ctx.scale(scale, scale)
  const path = new Path2D()
  backPath().forEach((p, i) => (i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y)))
  path.closePath()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 30 * scale * 4
  ctx.fillStyle = kit.colors.navy
  ctx.fill(path)
  ctx.shadowColor = 'transparent'
  ctx.clip(path)
  // mitad derecha del atlas = espalda
  ctx.drawImage(atlas, TEMPLATE_W * k, 0, TEMPLATE_W * k, TEMPLATE_H * k, 0, 0, TEMPLATE_W, TEMPLATE_H)
  // un poco de volumen: sombra suave en los bordes
  const g = ctx.createLinearGradient(0, 0, TEMPLATE_W, 0)
  g.addColorStop(0, 'rgba(0,0,0,0.35)')
  g.addColorStop(0.25, 'rgba(0,0,0,0)')
  g.addColorStop(0.75, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,0.35)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, TEMPLATE_W, TEMPLATE_H)
  ctx.restore()
}
