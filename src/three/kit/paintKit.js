import { seeded } from '../../engine/math'
import { kit as defaultKit } from './kitSpec'
import { layoutName, layoutNumber } from './lettering'
import { TEMPLATE_H, TEMPLATE_W, pxPerMetre, rowAt } from './uvMap'
/**
 * Pinta la remera lisa (sin nombre ni número) en un atlas frente|espalda a escala `k`
 * (1 = 1600 × 1035 px). Se pinta una vez por resolución y se reutiliza en todo el plantel.
 */
export function paintBase(brand, k, kit = defaultKit) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(TEMPLATE_W * 2 * k)
  canvas.height = Math.round(TEMPLATE_H * k)
  const ctx = canvas.getContext('2d')
  for (const side of ['front', 'back']) {
    ctx.save()
    ctx.setTransform(k, 0, 0, k, side === 'back' ? TEMPLATE_W * k : 0, 0)
    ctx.beginPath()
    ctx.rect(0, 0, TEMPLATE_W, TEMPLATE_H)
    ctx.clip()
    paintFabric(ctx, kit, side)
    paintBand(ctx, kit, side)
    paintTrims(ctx, kit, side)
    if (side === 'front') paintFrontLogos(ctx, kit, brand)
    else paintBackMarks(ctx, kit, brand)
    ctx.restore()
  }
  return canvas
}
/** Tela azul con un rayado tonal finito, como el tejido de la titular */
function paintFabric(ctx, kit, side) {
  const { navy, navyDeep, navyLight } = kit.colors
  const g = ctx.createLinearGradient(0, 0, 0, TEMPLATE_H)
  g.addColorStop(0, navyLight)
  g.addColorStop(0.35, navy)
  g.addColorStop(1, navyDeep)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, TEMPLATE_W, TEMPLATE_H)
  const rnd = seeded(side === 'front' ? 11 : 23)
  ctx.globalAlpha = 0.05
  for (let x = 0; x < TEMPLATE_W; x += 7) {
    ctx.fillStyle = rnd() > 0.5 ? '#5b70b0' : '#0d1838'
    ctx.fillRect(x, 0, 2.2, TEMPLATE_H)
  }
  ctx.globalAlpha = 1
}
/** Franja amarilla con filetes azul rey. Se ubica en metros para que coincida en los costados. */
function paintBand(ctx, kit, side) {
  const { centre, half, royal } = kit.band
  const yc = rowAt(side, centre)
  const s = pxPerMetre(side)
  const h = half * s
  const r = royal * s
  ctx.save()
  ctx.beginPath()
  for (const [index, [x, y]] of kit.band.torso[side].entries()) {
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.clip()
  ctx.fillStyle = kit.colors.royal
  ctx.fillRect(0, yc - h - r, TEMPLATE_W, h * 2 + r * 2)
  const g = ctx.createLinearGradient(0, yc - h, 0, yc + h)
  g.addColorStop(0, kit.colors.gold)
  g.addColorStop(1, kit.colors.goldDeep)
  ctx.fillStyle = g
  ctx.fillRect(0, yc - h, TEMPLATE_W, h * 2)
  ctx.restore()
}
function stroke(ctx, pts, width, color) {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.lineWidth = width
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}
function paintTrims(ctx, kit, side) {
  const { gold, navy, lining } = kit.colors
  const shoulders = kit.shoulders
  for (const line of shoulders[side]) {
    for (let stripe = 0; stripe < 3; stripe++) {
      stroke(ctx, line.map(([x, y]) => [x, y + stripe * shoulders.spacing]), shoulders.width, gold)
    }
  }
  for (const cuff of kit.cuffs[side]) stroke(ctx, cuff, kit.cuffs.width, gold)
  if (side === 'back') {
    stroke(ctx, kit.backCollar, 12, gold)
    return
  }
  // Cuello en V: abertura oscura, tira azul con borde amarillo afuera y adentro
  const c = kit.collar
  const L = c.left
  const R = c.right
  const T = c.vTip
  ctx.fillStyle = lining
  ctx.beginPath()
  ctx.moveTo(L[0], L[1] - 20)
  ctx.lineTo(T[0], T[1])
  ctx.lineTo(R[0], R[1] - 20)
  ctx.closePath()
  ctx.fill()
  const v = [
    [L[0] - 6, L[1] - 6],
    [T[0], T[1]],
    [R[0] + 6, R[1] - 6],
  ]
  stroke(ctx, v, c.band + c.edge * 2, gold)
  stroke(ctx, v, c.band, navy)
  const inner = [
    [L[0] + 2, L[1] - 12],
    [T[0], T[1] - c.band * 0.9],
    [R[0] - 2, R[1] - 12],
  ]
  stroke(ctx, inner, c.inner, gold)
}
function drawImage(ctx, img, cx, cy, w, rot = 0) {
  const h = (w * img.naturalHeight) / img.naturalWidth
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rot)
  ctx.drawImage(img, -w / 2, -h / 2, w, h)
  ctx.restore()
}
function paintFrontLogos(ctx, kit, brand) {
  const l = kit.logos
  drawImage(ctx, brand.adidas, l.adidas.x, l.adidas.y, l.adidas.w)
  const crestW = (l.crest.h * brand.crest.naturalWidth) / brand.crest.naturalHeight
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.25)'
  ctx.shadowBlur = 3
  drawImage(ctx, brand.crest, l.crest.x, l.crest.y, crestW)
  ctx.restore()
  drawImage(ctx, brand.betsson, 400, rowAt('front', kit.band.centre), l.betsson.w)
  for (const c of l.cetrogar) drawImage(ctx, brand.cetrogar, c.x, c.y, c.w, c.rot)
}
function paintBackMarks(ctx, kit, brand) {
  const { neck, directv } = kit.backMarks
  ctx.fillStyle = kit.colors.gold
  ctx.font = `italic 700 ${neck.size}px Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText(neck.text, neck.x, neck.baseline)
  drawImage(ctx, brand.directv, directv.x, directv.y, directv.w)
  drawImage(ctx, brand.cetrogar, 104, 382, 87, 0.13)
  drawImage(ctx, brand.cetrogar, 689, 357, 87, -0.13)
}
/**
 * Atlas final de un jugador: la base + nombre y número en la espalda.
 * `estampado` permite un número distinto al dorsal (personalizador).
 */
export function paintJersey(base, name, number, k, kit = defaultKit) {
  const canvas = document.createElement('canvas')
  canvas.width = base.width
  canvas.height = base.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(base, 0, 0)
  ctx.setTransform(k, 0, 0, k, TEMPLATE_W * k, 0)
  paintLettering(ctx, name, number, kit)
  return canvas
}
function paintLettering(ctx, name, number, kit) {
  const t = kit.lettering
  ctx.fillStyle = kit.colors.print
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const nameSize = t.nameCap / t.capRatio
  ctx.font = `${t.weight} ${nameSize}px "${t.font}"`
  const chars = [...name]
  const { glyphs, squeeze } = layoutName(
    chars.map((c) => ctx.measureText(c).width),
    t.cx,
    t.nameTracking * nameSize,
    t.nameMaxWidth,
  )
  glyphs.forEach((g, i) => {
    ctx.save()
    ctx.translate(g.x, t.nameBaseline)
    ctx.scale(squeeze, 1)
    ctx.fillText(chars[i], 0, 0)
    ctx.restore()
  })
  const numSize = t.numberCap / t.capRatio
  ctx.font = `${t.weight} ${numSize}px "${t.font}"`
  const digits = [...number]
  const centres = layoutNumber(
    digits.map((d) => ctx.measureText(d).width),
    t.cx,
    t.numberGap,
  )
  const baseline = t.numberCentre + t.numberCap / 2
  digits.forEach((d, i) => ctx.fillText(d, centres[i], baseline))
}
