import Delaunator from 'delaunator'
import { TEMPLATE_H, TEMPLATE_W, templateToWorld, worldToTemplate } from '../kit/uvMap'
import { BACK_NECK, OUTLINE } from './silhouette'

/**
 * Remera propia, generada por código (sin GLB): dos caras "infladas" a partir de
 * la silueta. Pura (sin three.js) para poder testearla: devuelve arrays planos que
 * después se cargan en un BufferGeometry.
 *
 * Cómo se arma cada cara:
 *  1. Silueta en metros (desde la plantilla del frente) + puntos de grilla adentro.
 *  2. Triangulación de Delaunay; se descartan triángulos fuera de la silueta.
 *  3. Volumen: z crece con la distancia a la costura más cercana (hombros, costados),
 *     así en el bajo, los puños y el cuello la tela queda abierta.
 *  4. Pliegues suaves hacia el bajo, oclusión en los colores de vértice y UV por
 *     proyección plana con la misma fórmula que usa la textura (uvMap.js).
 */

const STEP = 0.009 // separación de la grilla interior (m)
const EDGE_STEP = 0.006 // muestreo del borde (m)
const DEPTH = 0.046 // medio espesor máximo del cuerpo (m)
const ROUND = 0.075 // distancia a la costura en la que la tela llega a su espesor (m)
/** La remera cuelga de la percha: el cuello queda por debajo del riel para que se vean gancho y chapita */
export const HANG_DROP = 0.035

const toWorld = (side, [X, Y]) => {
  const p = templateToWorld(side, X, Y)
  return [p.x, p.y]
}

/** Remuestrea una polilínea cada `step` metros (incluye el primer punto, no el último) */
function resample(pts, step) {
  const out = []
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step))
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n])
  }
  return out
}

/** Contorno de una cara en metros: tramos con su tipo. La espalda cambia el escote. */
export function faceOutline(side, outline = OUTLINE) {
  return outline.map((seg, i) => {
    const neck = i === outline.length - 1
    if (side === 'back' && neck) {
      // escote de espalda: se arma en su plantilla y se lleva a metros, uniendo con los hombros
      const first = toWorld('front', outline.at(-1).pts[0])
      const last = toWorld('front', outline[0].pts[0])
      const mid = BACK_NECK.map((p) => toWorld('back', p))
      return { kind: 'open', pts: [first, ...mid, last] }
    }
    return { kind: seg.kind, pts: seg.pts.map((p) => toWorld('front', p)) }
  })
}

export function pointInPolygon(x, y, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function segDist(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

/** Distancia a la costura más cercana (los tramos 'open' no cuentan) */
function seamDistance(x, y, seams) {
  let d = Infinity
  for (const line of seams) for (let i = 0; i < line.length - 1; i++) d = Math.min(d, segDist(x, y, line[i], line[i + 1]))
  return d
}

/** Perfil de la tela: redondeado cerca de la costura, plano al centro */
export const inflate = (d) => {
  const t = Math.min(1, d / ROUND)
  return DEPTH * Math.sqrt(1 - (1 - t) * (1 - t))
}

/** Pliegues verticales que nacen en el pecho y se abren hacia el bajo (determinísticos) */
const folds = (x, y) => {
  const below = Math.min(1, Math.max(0, (-y - 0.28) / 0.4))
  return below * (0.006 * Math.sin(x * 38 + 0.6) + 0.004 * Math.sin(x * 71 + y * 9 + 1.7))
}

/** Arma una cara: 'front' mira a −Z, 'back' a +Z */
export function buildFace(side, silhouette) {
  const outline = faceOutline(side, silhouette)
  const ring = resample(
    outline.flatMap((s) => s.pts.slice(0, -1).concat([s.pts[s.pts.length - 1]])).filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]),
    EDGE_STEP,
  )
  const seams = outline.filter((s) => s.kind === 'seam').map((s) => s.pts)
  const poly = outline.flatMap((s) => s.pts)

  const pts = [...ring]
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const [x, y] of poly) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  for (let y = minY + STEP / 2, row = 0; y < maxY; y += STEP * 0.866, row++) {
    for (let x = minX + (row % 2 ? STEP / 2 : 0); x < maxX; x += STEP) {
      if (pointInPolygon(x, y, poly) && seamDistance(x, y, [poly.concat([poly[0]])]) > EDGE_STEP * 0.8) pts.push([x, y])
    }
  }

  const tri = new Delaunator(pts.flat()).triangles
  const sign = side === 'front' ? -1 : 1
  const index = []
  const maxEdge = STEP * 2.2
  for (let i = 0; i < tri.length; i += 3) {
    const a = pts[tri[i]]
    const b = pts[tri[i + 1]]
    const c = pts[tri[i + 2]]
    const cx = (a[0] + b[0] + c[0]) / 3
    const cy = (a[1] + b[1] + c[1]) / 3
    if (!pointInPolygon(cx, cy, poly)) continue
    if (Math.max(Math.hypot(a[0] - b[0], a[1] - b[1]), Math.hypot(b[0] - c[0], b[1] - c[1]), Math.hypot(c[0] - a[0], c[1] - a[1])) > maxEdge) continue
    // Orientación: la cara de afuera tiene que quedar de frente (el forro va en la de atrás)
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    // Astillas sobre el borde (área ~0): normales inválidas y orientación ambigua en float32
    if (Math.abs(cross) < 2e-6) continue
    if (cross * sign > 0) index.push(tri[i], tri[i + 1], tri[i + 2])
    else index.push(tri[i], tri[i + 2], tri[i + 1])
  }

  const n = pts.length
  const position = new Float32Array(n * 3)
  const uv = new Float32Array(n * 2)
  const color = new Float32Array(n * 3)
  pts.forEach(([x, y], i) => {
    const d = seamDistance(x, y, seams)
    const z = sign * (inflate(d) + folds(x, y) * Math.min(1, d / ROUND))
    position.set([x, y - HANG_DROP, z], i * 3)
    const t = worldToTemplate(side, x, y)
    uv.set([(t.x + (side === 'back' ? TEMPLATE_W : 0)) / (2 * TEMPLATE_W), t.y / TEMPLATE_H], i * 2)
    // Oclusión: más sombra en las costuras y bajo los brazos
    const k = 0.5 + 0.5 * Math.min(1, d / (ROUND * 1.3))
    color.set([k, k, k], i * 3)
  })
  return { position, uv, color, index: Uint32Array.from(index) }
}

/** Las dos caras en un solo juego de arrays */
export function buildShirtArrays(silhouette) {
  const front = buildFace('front', silhouette)
  const back = buildFace('back', silhouette)
  const offset = front.position.length / 3
  const index = new Uint32Array(front.index.length + back.index.length)
  index.set(front.index)
  index.set(
    back.index.map((i) => i + offset),
    front.index.length,
  )
  const join = (a, b) => {
    const out = new Float32Array(a.length + b.length)
    out.set(a)
    out.set(b, a.length)
    return out
  }
  return {
    position: join(front.position, back.position),
    uv: join(front.uv, back.uv),
    color: join(front.color, back.color),
    index,
    frontVertices: offset,
  }
}
