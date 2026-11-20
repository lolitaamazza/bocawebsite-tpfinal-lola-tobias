import * as THREE from 'three'
import { PITCH } from './layout'

const STRIPES = 22 // franjas de corte de pasto a lo largo
const CROSS_STRIPES = 14 // pasadas transversales suaves
const GRASS = ['#25592b', '#2e6b34']

/**
 * La cancha de La Bombonera pintada en un canvas de alta definición:
 * corte cruzado de césped, iluminación cenital de reflectores, áreas técnicas
 * sobre el lado de los palcos y líneas de cal reglamentarias (layout.PITCH).
 */
export function paintPitch(ctx, pxPerMeter) {
  const P = PITCH
  const W = P.length * pxPerMeter
  const H = P.width * pxPerMeter
  const m = (v) => v * pxPerMeter

  // Franjas longitudinales de corte
  for (let i = 0; i < STRIPES; i++) {
    ctx.fillStyle = GRASS[i % 2]
    ctx.fillRect((i * W) / STRIPES, 0, Math.ceil(W / STRIPES) + 1, H)
  }

  // Franjas transversales sutiles (damero de cancha de primera)
  for (let j = 0; j < CROSS_STRIPES; j++) {
    ctx.fillStyle = j % 2 === 0 ? 'rgba(255,255,240,0.032)' : 'rgba(0,12,4,0.038)'
    ctx.fillRect(0, (j * H) / CROSS_STRIPES, W, Math.ceil(H / CROSS_STRIPES) + 1)
  }

  // Foco dramático de los reflectores sobre el centro del césped (estilo Reel)
  const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.04, W / 2, H / 2, W * 0.65)
  g.addColorStop(0, 'rgba(255,252,232,0.12)')
  g.addColorStop(0.55, 'rgba(230,245,220,0.03)')
  g.addColorStop(1, 'rgba(2,8,4,0.26)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // Sello sutil de corte en el círculo central
  ctx.save()
  ctx.translate(W / 2, H / 2)
  ctx.fillStyle = 'rgba(255,255,240,0.04)'
  ctx.font = `900 ${Math.round(m(4.2))}px "Anton", "Arial Narrow", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('CABJ', 0, 0)
  ctx.restore()

  // Líneas de cal con leve halo luminoso
  ctx.strokeStyle = 'rgba(248,248,242,0.95)'
  ctx.fillStyle = 'rgba(248,248,242,0.95)'
  ctx.lineWidth = Math.max(2, m(P.line))
  const inset = ctx.lineWidth / 2
  ctx.strokeRect(inset, inset, W - 2 * inset, H - 2 * inset)

  // Línea de mitad de cancha y círculo central
  ctx.beginPath()
  ctx.moveTo(W / 2, 0)
  ctx.lineTo(W / 2, H)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(W / 2, H / 2, m(P.circle), 0, Math.PI * 2)
  ctx.stroke()

  const dot = (x, y, r = 0.22) => {
    ctx.beginPath()
    ctx.arc(x, y, Math.max(2, m(r)), 0, Math.PI * 2)
    ctx.fill()
  }
  dot(W / 2, H / 2, 0.24)

  // Áreas grandes, áreas chicas, puntos del penal, medialunas y córners
  for (const side of [0, 1]) {
    const x = side ? W : 0
    const dir = side ? -1 : 1
    const box = (depth, width) => ctx.strokeRect(side ? W - m(depth) : 0, H / 2 - m(width) / 2, m(depth), m(width))
    box(P.penaltyDepth, P.penaltyWidth)
    box(P.goalAreaDepth, P.goalAreaWidth)
    const spot = x + dir * m(P.spot)
    dot(spot, H / 2)
    const reach = Math.acos((P.penaltyDepth - P.spot) / P.circle)
    ctx.beginPath()
    if (side) ctx.arc(spot, H / 2, m(P.circle), Math.PI - reach, Math.PI + reach)
    else ctx.arc(spot, H / 2, m(P.circle), -reach, reach)
    ctx.stroke()
    for (const y of [0, H]) {
      ctx.beginPath()
      ctx.arc(x, y, m(P.corner), 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

/** Textura de la cancha lista para three (quien la usa la libera) */
export function pitchTexture(renderer, pxPerMeter = 24) {
  const c = document.createElement('canvas')
  c.width = Math.round(PITCH.length * pxPerMeter)
  c.height = Math.round(PITCH.width * pxPerMeter)
  paintPitch(c.getContext('2d'), pxPerMeter)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() ?? 1)
  return t
}
