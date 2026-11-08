import type { PosKey } from '../types'
import { clamp } from './math'

/**
 * Geometría del riel, sin three.js: dónde cuelga cada remera, hasta dónde se puede
 * deslizar y qué remera queda bajo el puntero. Todo en metros sobre el eje X del riel.
 */

/** Separación entre perchas consecutivas */
export const HANGER_GAP = 0.125
/** Hueco extra entre una línea y la siguiente (ARQ | DEF | MED | DEL) */
export const GROUP_GAP = 0.46
/** Margen que se deja ver antes de la primera y después de la última */
export const EDGE_MARGIN = 0.55
/** Radio de captura del puntero alrededor de una percha */
export const PICK_RADIUS = 0.17

export interface RailSlot {
  pos: PosKey
  active: boolean
  restX: number
}

export interface GroupSpan {
  pos: PosKey
  minX: number
  maxX: number
}

/**
 * Reparte las perchas activas, centradas en 0, con un hueco entre líneas.
 * Muta `restX` de los slots activos y devuelve el rango de cada línea.
 */
export function layoutRail(slots: RailSlot[]): GroupSpan[] {
  const active = slots.filter((s) => s.active)
  let x = 0
  let prev: PosKey | null = null
  for (const s of active) {
    if (prev && s.pos !== prev) x += GROUP_GAP
    s.restX = x
    x += HANGER_GAP
    prev = s.pos
  }
  const centre = active.length ? (active[0].restX + active[active.length - 1].restX) / 2 : 0
  const groups: GroupSpan[] = []
  for (const s of active) {
    s.restX -= centre
    const g = groups.find((g) => g.pos === s.pos)
    if (g) g.maxX = s.restX
    else groups.push({ pos: s.pos, minX: s.restX, maxX: s.restX })
  }
  return groups
}

/**
 * Límites del scroll del riel. `viewHalf` es medio ancho visible (en metros) a la
 * distancia del riel. Si todo entra en pantalla no hay scroll.
 */
export function railBounds(slots: RailSlot[], viewHalf: number) {
  const active = slots.filter((s) => s.active)
  if (!active.length) return { min: 0, max: 0 }
  const min = active[0].restX - EDGE_MARGIN + viewHalf
  const max = active[active.length - 1].restX + EDGE_MARGIN - viewHalf
  return min < max ? { min, max } : { min: 0, max: 0 }
}

/** Índice de la percha activa más cercana a `x` (en coordenadas del riel), o -1 */
export function pickSlot(slots: RailSlot[], x: number, radius = PICK_RADIUS): number {
  let best = -1
  let dist = radius
  slots.forEach((s, i) => {
    if (!s.active) return
    const d = Math.abs(s.restX - x)
    if (d < dist) {
      dist = d
      best = i
    }
  })
  return best
}

/** La percha activa más cercana al centro de la vista, sin radio */
export function centredSlot(slots: RailSlot[], x: number): number {
  return pickSlot(slots, x, Infinity)
}

/**
 * Siguiente/anterior activa (con vuelta) a partir de `from`. Si no hay ninguna
 * marcada arranca desde el principio (o desde el final si va hacia atrás).
 */
export function stepSlot(slots: RailSlot[], from: number, dir: 1 | -1): number {
  const active = slots.map((s, i) => (s.active ? i : -1)).filter((i) => i >= 0)
  if (!active.length) return -1
  const at = active.indexOf(from)
  const start = at >= 0 ? at : dir > 0 ? -1 : 0
  return active[(start + dir + active.length) % active.length]
}

/** Scroll objetivo para dejar la percha `i` centrada, respetando los límites */
export const scrollTo = (slot: RailSlot, bounds: { min: number; max: number }) => clamp(slot.restX, bounds.min, bounds.max)

/**
 * Cuando el puntero pasa por una remera, las vecinas se corren hacia afuera
 * para hacerle lugar; el empuje decae con la distancia.
 */
export function neighbourPush(offset: number) {
  if (offset === 0) return 0
  return Math.sign(offset) * 0.22 * Math.exp(-(Math.abs(offset) - 1) / 7)
}
