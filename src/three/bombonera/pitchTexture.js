import * as THREE from 'three'
import { PITCH } from './layout'

const STRIPES = 20 // franjas de corte de pasto a lo largo
const GRASS = ['#2f6a33', '#367a3b']

/**
 * La cancha pintada en un canvas: franjas de pasto y las líneas de cal con las
 * medidas reglamentarias (layout.PITCH). `pxPerMeter` define la resolución.
 */
export function paintPitch(ctx, pxPerMeter) {
  const P = PITCH
  const W = P.length * pxPerMeter
  const H = P.width * pxPerMeter
  const m = (v) => v * pxPerMeter
  for (let i = 0; i < STRIPES; i++) {
    ctx.fillStyle = GRASS[i % 2]
    ctx.fillRect((i * W) / STRIPES, 0, Math.ceil(W / STRIPES) + 1, H)
  }
  // un poco de variación para que no parezca plástico
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6)
  g.addColorStop(0, 'rgba(255,255,230,0.06)')
  g.addColorStop(1, 'rgba(0,0,0,0.12)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(245,245,238,0.92)'
  ctx.fillStyle = 'rgba(245,245,238,0.92)'
  ctx.lineWidth = Math.max(2, m(P.line))
  const inset = ctx.lineWidth / 2
  ctx.strokeRect(inset, inset, W - 2 * inset, H - 2 * inset)
  ctx.beginPath()
  ctx.moveTo(W / 2, 0)
  ctx.lineTo(W / 2, H)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(W / 2, H / 2, m(P.circle), 0, Math.PI * 2)
  ctx.stroke()
  const dot = (x, y) => {
    ctx.beginPath()
    ctx.arc(x, y, Math.max(2, m(0.2)), 0, Math.PI * 2)
    ctx.fill()
  }
  dot(W / 2, H / 2)
  for (const side of [0, 1]) {
    const x = side ? W : 0
    const dir = side ? -1 : 1
    const box = (depth, width) => ctx.strokeRect(side ? W - m(depth) : 0, H / 2 - m(width) / 2, m(depth), m(width))
    box(P.penaltyDepth, P.penaltyWidth)
    box(P.goalAreaDepth, P.goalAreaWidth)
    const spot = x + dir * m(P.spot)
    dot(spot, H / 2)
    // la medialuna: el arco de 9,15 m fuera del área grande
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
export function pitchTexture(renderer, pxPerMeter = 20) {
  const c = document.createElement('canvas')
  c.width = Math.round(PITCH.length * pxPerMeter)
  c.height = Math.round(PITCH.width * pxPerMeter)
  paintPitch(c.getContext('2d'), pxPerMeter)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() ?? 1)
  return t
}
