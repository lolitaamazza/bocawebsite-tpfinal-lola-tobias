import { cyrb53 } from '@/lib/domain/carnet'

/**
 * Geometría del carnet, pura (sin DOM): la usan el dibujo en canvas (vista previa y
 * PNG), el SVG del hero y los tests. Todo en "unidades de carnet": 10 por milímetro
 * de una tarjeta ISO/IEC 7810 ID-1 (85,6 × 54 mm → 856 × 540).
 * Las figuras salen como datos de path SVG: el canvas las dibuja con Path2D.
 */

export const CARD = { w: 856, h: 540, radius: 32, mm: { w: 85.6, h: 54 } }
/** El PNG sale al doble: 1712 × 1080 */
export const EXPORT_SCALE = 2

/** Copia de los tokens de globals.css (el canvas no lee variables CSS) */
export const PALETTE = {
  fondo: '#03060e',
  noche: '#0a1430',
  azul: '#1d3c8f',
  azulVivo: '#2b4fc4',
  oro: '#f0c057',
  oroHondo: '#d9a63c',
  claro: '#f1ede3',
}

const MARGIN = 44
const RIGHT = CARD.w - MARGIN

/** Frente. `y` de los textos es la línea de base; `size` el cuerpo en unidades. */
export const FRONT = {
  crest: { x: MARGIN, y: 34, w: 74, h: 88 },
  club: { x: 136, y: 58, size: 13 },
  clubName: { x: 136, y: 100, size: 40 },
  tag: { x: 136, y: 124, size: 13 },
  chip: { x: MARGIN, y: 158, w: 70, h: 52, r: 10 },
  photo: { x: 620, y: 128, w: 192, h: 256, r: 16 },
  name: { x: MARGIN, y: 318, w: 548, max: 64, min: 26 },
  apodo: { x: MARGIN + 2, y: 362, w: 548, size: 32 },
  socioLabel: { x: MARGIN, y: 414, size: 12 },
  socio: { x: MARGIN, y: 452, w: 260, size: 26 },
  desdeLabel: { x: 330, y: 414, size: 12 },
  desde: { x: 330, y: 452, w: 120, size: 36 },
  legal: { x: MARGIN, y: 500, w: 480, size: 11 },
}

export const BACK = {
  stripe: { x: 0, y: 34, w: CARD.w, h: 72 },
  stripeText: { x: RIGHT, y: 78, size: 13 },
  firma: { x: MARGIN, y: 136, w: 520, h: 58 },
  firmaText: { x: MARGIN + 16, y: 178, w: 488, max: 38, min: 18 },
  firmaLabel: { x: MARGIN, y: 216, size: 10 },
  matrix: { x: 640, y: 128, size: 172, pad: 10, n: 21 },
  matrixLabel: { x: 726, y: 322, size: 10 },
  socioDesdeLabel: { x: MARGIN, y: 254, size: 12 },
  socioDesde: { x: MARGIN, y: 290, w: 230, size: 28 },
  ubicacionLabel: { x: 300, y: 254, size: 12 },
  ubicacion: { x: 300, y: 290, w: 300, size: 28 },
  idoloLabel: { x: MARGIN, y: 330, size: 12 },
  idolo: { x: MARGIN, y: 366, w: 560, size: 28 },
  rule: { x: MARGIN, y: 396, w: RIGHT - MARGIN },
  frase: { x: MARGIN, y: 444, w: RIGHT - MARGIN, size: 30 },
  legal: { x: MARGIN, y: 496, w: RIGHT - MARGIN, size: 10 },
}

/** Franja dorada en diagonal: se define por dónde toca abajo y cuánto corre hacia arriba */
export const FRANJA = { bottom: 560, width: 100, run: 200 }
export const franjaX = (y, offset = 0) => FRANJA.bottom + offset + ((CARD.h - y) * FRANJA.run) / CARD.h

const f = (n) => (Math.round(n * 10) / 10).toString()

/** Paralelogramo entre dos "offsets" de la franja, un poco pasado del borde (lo recorta el clip) */
export function bandPath(from, to) {
  const top = -20
  const bottom = CARD.h + 20
  return `M${f(franjaX(bottom, from))} ${bottom}L${f(franjaX(bottom, to))} ${bottom}L${f(franjaX(top, to))} ${top}L${f(franjaX(top, from))} ${top}Z`
}

/** Las tres franjas: la ancha y dos filetes paralelos */
export const franjaPaths = () => ({
  main: bandPath(0, FRANJA.width),
  thin: bandPath(FRANJA.width + 26, FRANJA.width + 34),
  hair: bandPath(-22, -18),
})

/** Rectángulo redondeado como path SVG */
export function roundRectPath(x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  return `M${f(x + rr)} ${f(y)}H${f(x + w - rr)}A${rr} ${rr} 0 0 1 ${f(x + w)} ${f(y + rr)}V${f(y + h - rr)}A${rr} ${rr} 0 0 1 ${f(x + w - rr)} ${f(y + h)}H${f(x + rr)}A${rr} ${rr} 0 0 1 ${f(x)} ${f(y + h - rr)}V${f(y + rr)}A${rr} ${rr} 0 0 1 ${f(x + rr)} ${f(y)}Z`
}

export const cardPath = () => roundRectPath(0, 0, CARD.w, CARD.h, CARD.radius)

function polyline(points) {
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('')
}

/**
 * Guilloche de billete: anillos ondulados concéntricos, un rosetón de espirógrafo y una
 * banda de ondas. `quality` escala la cantidad de puntos (1 para el carnet, menos para el hero).
 */
export function guillochePaths({ quality = 1 } = {}) {
  const q = Math.max(0.2, Math.min(1, quality))
  const rings = []
  for (let i = 0; i < 12; i++) {
    const R = 70 + i * 17
    const steps = Math.round(288 * q)
    const pts = []
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * Math.PI * 2
      const r = R + 7 * Math.sin(24 * t + i * 0.55)
      pts.push([210 + r * Math.cos(t), 300 + r * Math.sin(t)])
    }
    rings.push(polyline(pts))
  }

  const rosette = []
  for (let j = 0; j < 3; j++) {
    const steps = Math.round(600 * q)
    const rot = (j * Math.PI * 2) / 33
    const pts = []
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * Math.PI * 2
      const x = 74 * Math.cos(t) + 40 * Math.cos(11 * t)
      const y = 74 * Math.sin(t) - 40 * Math.sin(11 * t)
      pts.push([716 + x * Math.cos(rot) - y * Math.sin(rot), 256 + x * Math.sin(rot) + y * Math.cos(rot)])
    }
    rosette.push(polyline(pts))
  }

  const waves = []
  for (let i = 0; i < 10; i++) {
    const steps = Math.round(110 * q)
    const pts = []
    for (let s = 0; s <= steps; s++) {
      const x = -10 + (s / steps) * (CARD.w + 20)
      pts.push([x, 424 + i * 10 + 9 * Math.sin((x / 214) * Math.PI * 2 + i * 0.45)])
    }
    waves.push(polyline(pts))
  }

  return { rings: rings.join(''), rosette: rosette.join(''), waves: waves.join('') }
}

// ───────── Patrón decorativo tipo QR (NO es un QR: no codifica nada) ─────────

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** ¿(r, c) cae en una de las tres "esquinas" (7×7 + separador)? Devuelve el módulo o null */
function finderCell(r, c, n) {
  const corners = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ]
  for (const [r0, c0] of corners) {
    const dr = r - r0
    const dc = c - c0
    if (dr >= -1 && dr <= 7 && dc >= -1 && dc <= 7) {
      if (dr < 0 || dr > 6 || dc < 0 || dc > 6) return 0 // separador
      const ring = Math.min(dr, dc, 6 - dr, 6 - dc)
      return ring === 1 ? 0 : 1
    }
  }
  return null
}

/** Matriz n×n determinística a partir de una semilla: 1 oscuro, 0 claro */
export function decorativeMatrix(seed, n = 21) {
  const rand = mulberry32(cyrb53(String(seed)) % 4294967296)
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => {
      const fixed = finderCell(r, c, n)
      return fixed ?? (rand() < 0.5 ? 1 : 0)
    }),
  )
}

/**
 * Paths del patrón dentro de su caja: `dark` son los módulos (corridas horizontales
 * unidas en un rectángulo) y `accent` los tres centros de las esquinas (van en oro).
 */
export function matrixPaths(matrix, { x, y, size, pad }) {
  const n = matrix.length
  const m = (size - pad * 2) / n
  const ox = x + pad
  const oy = y + pad
  const isCenter = (r, c) => [[0, 0], [0, n - 7], [n - 7, 0]].some(([r0, c0]) => r - r0 >= 2 && r - r0 <= 4 && c - c0 >= 2 && c - c0 <= 4)
  let dark = ''
  let accent = ''
  for (let r = 0; r < n; r++) {
    let c = 0
    while (c < n) {
      if (!matrix[r][c] || isCenter(r, c)) {
        c++
        continue
      }
      const start = c
      while (c < n && matrix[r][c] && !isCenter(r, c)) c++
      dark += `M${f(ox + start * m)} ${f(oy + r * m)}h${f((c - start) * m)}v${f(m)}h${f(-(c - start) * m)}Z`
    }
  }
  for (const [r0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    accent += `M${f(ox + (c0 + 2) * m)} ${f(oy + (r0 + 2) * m)}h${f(3 * m)}v${f(3 * m)}h${f(-3 * m)}Z`
  }
  return { dark, accent }
}

// ───────── Texto e imagen ─────────

/**
 * Cuerpo de letra para que un texto entre en `maxWidth`: se mide una vez a `refSize`
 * y se escala (el ancho es proporcional al cuerpo). Queda entre `min` y `max`.
 */
export function fitFontSize(measuredAtRef, refSize, maxWidth, { min, max }) {
  if (!(measuredAtRef > 0)) return max
  const size = (refSize * maxWidth) / measuredAtRef
  return Math.max(min, Math.min(max, size))
}

/**
 * Recorte "cover" de una imagen para llenar una caja sin deformarla. En fotos verticales
 * baja menos que el centro (`focusY`) para no cortar la cara. null si no hay medidas.
 */
export function coverRect(srcW, srcH, boxW, boxH, focusY = 0.3) {
  if (!(srcW > 0 && srcH > 0 && boxW > 0 && boxH > 0)) return null
  const box = boxW / boxH
  if (srcW / srcH > box) {
    const sw = srcH * box
    return { sx: (srcW - sw) / 2, sy: 0, sw, sh: srcH }
  }
  const sh = srcW / box
  return { sx: 0, sy: (srcH - sh) * focusY, sw: srcW, sh }
}
