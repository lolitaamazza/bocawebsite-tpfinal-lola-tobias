import { hermite, monotoneTangents, segmentOf } from './spline'

/**
 * Recorrido de la cámara por la vitrina, atado al scroll (p de 0 a 1).
 *
 * p = 0: plano general desde abajo (la vitrina entra en pantalla).
 * En cada estante i la cámara llega a la altura del estante y lo recorre de
 * punta a punta como un travelling (en zigzag: uno de izquierda a derecha, el
 * siguiente al revés), centrado en stops[i]: el momento en que su texto queda
 * en el medio de la pantalla. p = 1: plano general desde arriba.
 * Entre claves, cúbica monótona: sin rebotes ni pasarse de largo.
 *
 * Todo puro (arrays [x, y, z]); el componente lo copia a la cámara de three.
 */
export const FOV = 30
const TILT = Math.tan((7 * Math.PI) / 180) // mira apenas hacia abajo
const HOLD = 0.62 // parte del tramo de cada estante que se usa para recorrerlo
const D_MIN = 1.6
const D_MAX = 2.6 // más lejos ya es un plano general: se pierde el "pasar al lado"
const FRAME = 1.5 // aire vertical al encuadrar un estante (se ve un poco del de arriba y del de abajo)
const PAD = 0.08 // aire a los costados al recorrer un estante
const MIN_SWEEP = 0.12 // si el estante entra entero, igual se desliza un poco

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const tanHalf = (fov) => Math.tan((fov * Math.PI) / 360)

export const uniformStops = (n) => Array.from({ length: n }, (_, i) => (i + 1) / (n + 1))

/**
 * En qué p del scroll queda centrado cada ítem de la lista. El disparador va de
 * "carril asoma abajo" (top bottom) a "carril se fue arriba" (bottom top), así
 * que recorre trackHeight + viewport. `centers`: centro de cada ítem medido
 * desde el borde de arriba del carril. Si algo no cierra, reparte parejo.
 */
export function walkStops(n, { centers, trackHeight, viewport } = {}) {
  if (!centers || centers.length !== n || !(trackHeight > 0) || !(viewport > 0)) return uniformStops(n)
  const total = trackHeight + viewport
  const stops = centers.map((c) => (c + viewport / 2) / total)
  const ok = stops.every((s, i) => s > 0 && s < 1 && (i === 0 || s > stops[i - 1]))
  return ok ? stops : uniformStops(n)
}

/** Estante "en foco" para el avance p (la mitad del camino a cada vecino); null antes y después */
export function activeShelf(stops, p) {
  const n = stops.length
  if (!n) return null
  for (let i = 0; i < n; i++) {
    const lo = i > 0 ? (stops[i - 1] + stops[i]) / 2 : stops[0] - (n > 1 ? (stops[1] - stops[0]) / 2 : Math.min(stops[0], 1 - stops[0]) / 2)
    const hi =
      i < n - 1 ? (stops[i] + stops[i + 1]) / 2 : stops[i] + (n > 1 ? (stops[i] - stops[i - 1]) / 2 : Math.min(stops[0], 1 - stops[0]) / 2)
    if (p >= lo && p < hi) return i
  }
  return null
}

/** Plano general: entra el mueble entero (con aire) para ese aspecto */
export function overview(cab, { aspect, fov = FOV, lift = 0, side = 0, margin = 1.14 } = {}) {
  const t = tanHalf(fov)
  const d = Math.max((cab.height * margin) / 2 / t, (cab.width * margin) / 2 / (t * aspect)) + cab.depth / 2
  const ty = cab.height / 2
  return { pos: [side * cab.width, ty + lift * cab.height, d], target: [0, ty, 0] }
}

/** Claves del recorrido: [{ p, pos, target }] con p estrictamente creciente */
export function walkKeys(cab, { aspect, fov = FOV, stops } = {}) {
  const n = cab.shelves.length
  const s = stops && stops.length === n ? stops : uniformStops(n)
  const t = tanHalf(fov)
  const keys = [{ p: 0, ...overview(cab, { aspect, fov, lift: -0.08, side: -0.1 }) }]
  cab.shelves.forEach((sh, i) => {
    const prev = i === 0 ? 0 : s[i - 1]
    const next = i === n - 1 ? 1 : s[i + 1]
    const half = (HOLD / 2) * Math.min(s[i] - prev, next - s[i])
    // de cerca, pero si el estante entra a lo ancho sin pasar D_MAX, se aleja hasta verlo entero
    const fitHeight = (sh.clear * FRAME) / 2 / t
    const fitWidth = (sh.halfSpan + PAD) / (t * aspect)
    const d = clamp(Math.max(fitHeight, Math.min(fitWidth, D_MAX)), D_MIN, D_MAX)
    const sweep = Math.max(MIN_SWEEP, sh.halfSpan + PAD - d * t * aspect)
    const dir = i % 2 ? -1 : 1
    const ty = sh.y + sh.contentHeight / 2
    const cy = ty + d * TILT
    for (const [dp, side] of [
      [-half, -dir],
      [half, dir],
    ])
      keys.push({ p: s[i] + dp, pos: [side * sweep, cy, d], target: [side * sweep, ty, 0], shelf: i })
  })
  keys.push({ p: 1, ...overview(cab, { aspect, fov, lift: 0.08, side: 0.1 }) })
  return keys
}

/** Precalcula las tangentes de las 6 componentes (posición y mira) */
export function prepareWalk(keys) {
  const ps = keys.map((k) => k.p)
  const comps = []
  for (const field of ['pos', 'target'])
    for (let c = 0; c < 3; c++) {
      const ys = keys.map((k) => k[field][c])
      comps.push({ ys, m: monotoneTangents(ps, ys, { rest: true }) })
    }
  return { ps, comps }
}

/** Cámara en el avance p. `out` se reutiliza para no generar basura por cuadro. */
export function sampleWalk(walk, p, out = { pos: [0, 0, 0], target: [0, 0, 0] }) {
  const { ps, comps } = walk
  const x = clamp(p, ps[0], ps[ps.length - 1])
  const k = segmentOf(ps, x)
  for (let c = 0; c < 6; c++) {
    const v = hermite(ps, comps[c].ys, comps[c].m, k, x)
    if (c < 3) out.pos[c] = v
    else out.target[c - 3] = v
  }
  return out
}
