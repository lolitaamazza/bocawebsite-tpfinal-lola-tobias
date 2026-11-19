import { BACK, CARD, EXPORT_SCALE, FRONT, PALETTE, cardPath, coverRect, decorativeMatrix, fitFontSize, franjaPaths, franjaX, guillochePaths, matrixPaths, roundRectPath } from './cardArt'

/**
 * Dibuja el carnet en un canvas 2D. Es el único dibujo: la vista previa y el PNG
 * salen de acá, así lo que ves es exactamente lo que descargás.
 */

export const FONT = {
  display: '"Anton", "Arial Narrow", sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
  dorsal: '"Chakra Petch", "Arial Narrow", sans-serif',
  serif: '"Instrument Serif", Georgia, serif',
}
/** Lo que hay que cargar antes de dibujar (las @font-face vienen de globals.css) */
export const FONT_FACES = ['400 40px "Anton"', '600 16px "JetBrains Mono"', '700 30px "Chakra Petch"', 'italic 400 30px "Instrument Serif"']

export const LEGAL_FRONT = 'TRIBUTO NO OFICIAL · SIN VALIDEZ COMO CREDENCIAL'
export const LEGAL_BACK = 'CARNET VIRTUAL DE HINCHA · TRIBUTO NO OFICIAL · SIN VALIDEZ COMO CREDENCIAL NI ACCESO AL ESTADIO'
export const MATRIX_LABEL = ['PATRÓN DECORATIVO', 'NO ES UN QR']

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// Path2D de las figuras fijas: se arman una sola vez (las variables no se guardan para no crecer)
let art = null
const paths = new Map()
function p2d(d, keep = false) {
  let p = paths.get(d)
  if (!p) {
    p = new Path2D(d)
    if (keep) paths.set(d, p)
  }
  return p
}
function staticArt() {
  art ??= { card: cardPath(), guilloche: guillochePaths(), franja: franjaPaths() }
  return art
}

function setFont(ctx, { family, size, weight = 400, style = '' }) {
  ctx.font = `${style} ${weight} ${size}px ${family}`.trim()
}

function spacing(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`
}

/** Texto con cuerpo fijo; `maxWidth` lo comprime si igual no entra */
function label(ctx, str, x, y, { family = FONT.mono, size, weight = 600, color, track = 0, align = 'left', maxWidth }) {
  setFont(ctx, { family, size, weight })
  spacing(ctx, track)
  ctx.fillStyle = color
  ctx.textAlign = align
  if (maxWidth) ctx.fillText(str, x, y, maxWidth)
  else ctx.fillText(str, x, y)
  spacing(ctx, 0)
}

/** Texto que achica el cuerpo para entrar en `box.w` (entre box.min y box.max) */
function fitted(ctx, str, box, { family, weight = 400, style = '', color, track = 0 }) {
  const ref = 100
  setFont(ctx, { family, size: ref, weight, style })
  spacing(ctx, (track * ref) / (box.max ?? box.size))
  const size = fitFontSize(ctx.measureText(str).width, ref, box.w, { min: box.min ?? box.size * 0.55, max: box.max ?? box.size })
  setFont(ctx, { family, size, weight, style })
  spacing(ctx, (track * size) / (box.max ?? box.size))
  ctx.fillStyle = color
  ctx.textAlign = 'left'
  ctx.fillText(str, box.x, box.y, box.w)
  spacing(ctx, 0)
  return size
}

function guilloche(ctx, alphas) {
  const g = staticArt().guilloche
  ctx.lineWidth = 1
  for (const [key, a] of Object.entries(alphas)) {
    ctx.strokeStyle = rgba(PALETTE.oro, a)
    ctx.stroke(p2d(g[key], true))
  }
}

function background(ctx, from, to, glow) {
  const bg = ctx.createLinearGradient(0, 0, CARD.w, CARD.h)
  bg.addColorStop(0, from)
  bg.addColorStop(1, to)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD.w, CARD.h)
  if (glow) {
    const r = ctx.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, glow.r)
    r.addColorStop(0, rgba(PALETTE.azulVivo, glow.a))
    r.addColorStop(1, rgba(PALETTE.azulVivo, 0))
    ctx.fillStyle = r
    ctx.fillRect(0, 0, CARD.w, CARD.h)
  }
}

/** Borde fino y brillo de arriba, comunes a las dos caras */
function finish(ctx) {
  const gloss = ctx.createLinearGradient(0, 0, 0, CARD.h * 0.55)
  gloss.addColorStop(0, 'rgba(255,255,255,0.07)')
  gloss.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gloss
  ctx.fillRect(0, 0, CARD.w, CARD.h)
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.stroke(p2d(staticArt().card, true))
}

function franja(ctx) {
  const { main, thin, hair } = staticArt().franja
  const g = ctx.createLinearGradient(franjaX(CARD.h), CARD.h, franjaX(0) + 100, 0)
  g.addColorStop(0, PALETTE.oroHondo)
  g.addColorStop(0.45, PALETTE.oro)
  g.addColorStop(0.55, '#ffe29a')
  g.addColorStop(1, PALETTE.oroHondo)
  ctx.fillStyle = g
  ctx.fill(p2d(main, true))
  ctx.fillStyle = rgba(PALETTE.oro, 0.85)
  ctx.fill(p2d(thin, true))
  ctx.fillStyle = rgba(PALETTE.oro, 0.55)
  ctx.fill(p2d(hair, true))
}

function chip(ctx) {
  const { x, y, w, h, r } = FRONT.chip
  const g = ctx.createLinearGradient(x, y, x + w, y + h)
  g.addColorStop(0, '#f7d98b')
  g.addColorStop(0.5, PALETTE.oroHondo)
  g.addColorStop(1, '#b8862c')
  ctx.fillStyle = g
  ctx.fill(p2d(roundRectPath(x, y, w, h, r), true))
  ctx.strokeStyle = 'rgba(70,45,5,0.55)'
  ctx.lineWidth = 1.5
  ctx.stroke(p2d(`M${x} ${y + h / 3}H${x + w * 0.38}M${x} ${y + (2 * h) / 3}H${x + w * 0.38}M${x + w} ${y + h / 3}H${x + w * 0.62}M${x + w} ${y + (2 * h) / 3}H${x + w * 0.62}M${x + w * 0.38} ${y}V${y + h}M${x + w * 0.62} ${y}V${y + h}`, true))
}

function photo(ctx, model, img) {
  const { x, y, w, h, r } = FRONT.photo
  const box = p2d(roundRectPath(x, y, w, h, r), true)
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 24
  ctx.shadowOffsetY = 10
  ctx.fillStyle = PALETTE.noche
  ctx.fill(box)
  ctx.restore()

  ctx.save()
  ctx.clip(box)
  const crop = img ? coverRect(img.naturalWidth || img.width, img.naturalHeight || img.height, w, h) : null
  if (crop) {
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, x, y, w, h)
  } else {
    const g = ctx.createLinearGradient(x, y, x, y + h)
    g.addColorStop(0, PALETTE.azul)
    g.addColorStop(1, PALETTE.noche)
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
    label(ctx, model.iniciales, x + w / 2, y + h / 2 + 34, { family: FONT.dorsal, size: 96, weight: 700, color: rgba(PALETTE.oro, 0.9), align: 'center', maxWidth: w - 24 })
  }
  ctx.restore()
  ctx.lineWidth = 3
  ctx.strokeStyle = PALETTE.oro
  ctx.stroke(box)
}

export function drawFront(ctx, model, { crest = null, photo: img = null } = {}) {
  const { card } = staticArt()
  ctx.save()
  ctx.clip(p2d(card, true))
  background(ctx, '#0d1c47', PALETTE.noche, { x: 210, y: 300, r: 380, a: 0.35 })
  guilloche(ctx, { rings: 0.1, rosette: 0.12, waves: 0.07 })
  franja(ctx)
  photo(ctx, model, img)

  if (crest) ctx.drawImage(crest, FRONT.crest.x, FRONT.crest.y, FRONT.crest.w, FRONT.crest.h)
  label(ctx, 'CLUB ATLÉTICO', FRONT.club.x, FRONT.club.y, { size: FRONT.club.size, color: rgba(PALETTE.claro, 0.72), track: 3 })
  label(ctx, 'BOCA JUNIORS', FRONT.clubName.x, FRONT.clubName.y, { family: FONT.display, size: FRONT.clubName.size, weight: 400, color: PALETTE.claro, track: 1 })
  label(ctx, 'CARNET DE HINCHA', FRONT.tag.x, FRONT.tag.y, { size: FRONT.tag.size, color: PALETTE.oro, track: 3 })
  chip(ctx)

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 3
  fitted(ctx, model.nombre, FRONT.name, { family: FONT.display, color: model.nombreVacio ? rgba(PALETTE.claro, 0.3) : PALETTE.claro, track: 1 })
  ctx.restore()
  if (model.apodo) fitted(ctx, `«${model.apodo}»`, { ...FRONT.apodo, max: FRONT.apodo.size, min: 18 }, { family: FONT.serif, style: 'italic', color: PALETTE.oro })

  label(ctx, 'N.º DE SOCIO', FRONT.socioLabel.x, FRONT.socioLabel.y, { size: FRONT.socioLabel.size, color: rgba(PALETTE.claro, 0.55), track: 2.5 })
  label(ctx, 'HINCHA DESDE', FRONT.desdeLabel.x, FRONT.desdeLabel.y, { size: FRONT.desdeLabel.size, color: rgba(PALETTE.claro, 0.55), track: 2.5 })
  label(ctx, model.socio, FRONT.socio.x, FRONT.socio.y, { size: FRONT.socio.size, color: model.socio === 'PREVIEW' ? PALETTE.oro : PALETTE.claro, track: 2, maxWidth: FRONT.socio.w })
  label(ctx, model.desde, FRONT.desde.x, FRONT.desde.y, { family: FONT.dorsal, size: FRONT.desde.size, weight: 700, color: PALETTE.oro, track: 1, maxWidth: FRONT.desde.w })
  label(ctx, LEGAL_FRONT, FRONT.legal.x, FRONT.legal.y, { size: FRONT.legal.size, color: rgba(PALETTE.claro, 0.42), track: 1.5, maxWidth: FRONT.legal.w })

  finish(ctx)
  ctx.restore()
}

export function drawBack(ctx, model, { crest = null } = {}) {
  const { card } = staticArt()
  ctx.save()
  ctx.clip(p2d(card, true))
  background(ctx, PALETTE.noche, '#060c1f', { x: 640, y: 420, r: 420, a: 0.2 })
  guilloche(ctx, { rings: 0.05, waves: 0.06 })

  const s = BACK.stripe
  const stripe = ctx.createLinearGradient(0, s.y, 0, s.y + s.h)
  stripe.addColorStop(0, '#0b0d12')
  stripe.addColorStop(0.5, '#1a1d24')
  stripe.addColorStop(1, '#07080b')
  ctx.fillStyle = stripe
  ctx.fillRect(s.x, s.y, s.w, s.h)
  label(ctx, `N.º ${model.socio}`, BACK.stripeText.x, BACK.stripeText.y, { size: BACK.stripeText.size, color: rgba(PALETTE.claro, 0.5), track: 2, align: 'right' })
  if (crest) ctx.drawImage(crest, 44, s.y + 12, 40, 48)

  // Tira de firma: papel claro con rayado fino y el nombre "firmado"
  const fb = BACK.firma
  const firma = p2d(roundRectPath(fb.x, fb.y, fb.w, fb.h, 6), true)
  ctx.fillStyle = PALETTE.claro
  ctx.fill(firma)
  ctx.save()
  ctx.clip(firma)
  ctx.strokeStyle = rgba(PALETTE.azul, 0.08)
  ctx.lineWidth = 1
  let hatch = ''
  for (let x = fb.x - fb.h; x < fb.x + fb.w; x += 7) hatch += `M${x} ${fb.y + fb.h}L${x + fb.h} ${fb.y}`
  ctx.stroke(p2d(hatch, true))
  ctx.restore()
  if (model.firma) fitted(ctx, model.firma, BACK.firmaText, { family: FONT.serif, style: 'italic', color: PALETTE.noche })
  label(ctx, 'FIRMA DEL HINCHA', BACK.firmaLabel.x, BACK.firmaLabel.y, { size: BACK.firmaLabel.size, color: rgba(PALETTE.claro, 0.45), track: 2 })

  // Patrón decorativo (no es un QR) y su aclaración
  const mb = BACK.matrix
  ctx.fillStyle = PALETTE.claro
  ctx.fill(p2d(roundRectPath(mb.x, mb.y, mb.size, mb.size, 10), true))
  const { dark, accent } = matrixPaths(decorativeMatrix(model.seed, mb.n), mb)
  ctx.fillStyle = PALETTE.noche
  ctx.fill(p2d(dark))
  ctx.fillStyle = PALETTE.oroHondo
  ctx.fill(p2d(accent))
  label(ctx, MATRIX_LABEL[0], BACK.matrixLabel.x, BACK.matrixLabel.y, { size: BACK.matrixLabel.size, color: rgba(PALETTE.claro, 0.55), track: 1.5, align: 'center' })
  label(ctx, MATRIX_LABEL[1], BACK.matrixLabel.x, BACK.matrixLabel.y + 16, { size: BACK.matrixLabel.size, color: rgba(PALETTE.claro, 0.55), track: 1.5, align: 'center' })

  const stat = (title, lb, value, vb) => {
    label(ctx, title, lb.x, lb.y, { size: lb.size, color: rgba(PALETTE.claro, 0.55), track: 2.5 })
    fitted(ctx, value, { ...vb, max: vb.size, min: 15 }, { family: FONT.dorsal, weight: 700, color: PALETTE.claro, track: 0.5 })
  }
  stat('SOCIO DESDE', BACK.socioDesdeLabel, model.socioDesde, BACK.socioDesde)
  stat('UBICACIÓN', BACK.ubicacionLabel, model.ubicacion, BACK.ubicacion)
  stat('ÍDOLO', BACK.idoloLabel, model.idolo, BACK.idolo)

  ctx.fillStyle = rgba(PALETTE.oro, 0.35)
  ctx.fillRect(BACK.rule.x, BACK.rule.y, BACK.rule.w, 1.5)
  fitted(ctx, `“${model.frase}”`, { ...BACK.frase, max: BACK.frase.size, min: 18 }, { family: FONT.serif, style: 'italic', color: PALETTE.oro })
  fitted(ctx, LEGAL_BACK, { ...BACK.legal, max: BACK.legal.size, min: 7 }, { family: FONT.mono, weight: 600, color: rgba(PALETTE.claro, 0.4), track: 1.2 })

  finish(ctx)
  ctx.restore()
}

/**
 * Dibuja una cara en `canvas` a `scale` × (856 × 540). Ajusta el tamaño del canvas
 * solo si cambió (cambiarlo lo borra y cuesta).
 */
export function renderCard(canvas, side, model, assets = {}, scale = EXPORT_SCALE) {
  const w = Math.round(CARD.w * scale)
  const h = Math.round(CARD.h * scale)
  if (canvas.width !== w) canvas.width = w
  if (canvas.height !== h) canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, w, h)
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  if (side === 'back') drawBack(ctx, model, assets)
  else drawFront(ctx, model, assets)
  return true
}
