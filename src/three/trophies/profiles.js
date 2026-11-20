import { monotone } from './spline'

/**
 * Trofeos reales de la Vitrina de Boca, modelados por código con sus
 * proporciones, materiales y detalles característicos:
 *  - Copa Libertadores: pedestal alto de madera caoba con filas de chapitas
 *    metálicas de los campeones, cuerpo de plata con globo central, dos asas
 *    en el globo, tapa escalonada y el futbolista pateando sobre el mundo arriba.
 *  - Copa Intercontinental: base oscura con placas, cáliz imperial de oro con
 *    tallos anillados, dos asas altas y corona con pelota arriba.
 *  - Copa Sudamericana: base escalonada con placas, columna anillada de plata
 *    que sostiene la gran esfera superior rodeada por su anillo inclinado.
 *  - Copa Argentina: pedestal negro con placas, columna facetada de plata con
 *    aletas verticales que abrazan la pelota en la boca superior.
 *  - Primera División: base de madera con aro y placa dorada, copa clásica
 *    dorada con asas laterales.
 *
 * Este módulo no importa three: se prueba en node (trophies.test.js).
 */
export const TROPHIES = {
  // Pedestal alto de caoba lleno de chapitas + globo central con asas + tapa y jugador pateando arriba
  libertadores: {
    name: 'Copa Libertadores',
    metal: 'silver',
    plinthColor: '#261109',
    plaques: { rows: 4, cols: 8 },
    plinth: {
      shape: 'round',
      steps: [
        [0.098, 0.024],
        [0.086, 0.135],
        [0.074, 0.018],
      ],
    },
    body: {
      outer: [
        [0, 0.064],
        [0.012, 0.064],
        [0.026, 0.048],
        [0.048, 0.022],
        [0.072, 0.016],
        [0.09, 0.028],
        [0.108, 0.016],
        [0.138, 0.022],
        [0.165, 0.056],
        [0.2, 0.076],
        [0.235, 0.08],
        [0.27, 0.075],
        [0.3, 0.054],
        [0.322, 0.068],
        [0.336, 0.062],
        [0.365, 0.042],
        [0.395, 0.022],
        [0.415, 0.014],
        [0.432, 0.024],
        [0.448, 0.026],
        [0.464, 0.018],
        [0.476, 0.008],
      ],
    },
    handles: { y: 0.235, R: 0.038, tube: 0.0075, arc: Math.PI * 1.24 },
    finial: { y: 0.506, r: 0.028 },
    figurine: true,
    spin: true,
    segments: 48,
    layout: { spacing: 0.44, maxPerRow: 8, rowGap: 0.36, rowRise: 0.08 },
  },

  // Copa Intercontinental (Europeo-Sudamericana / Toyota): cáliz de oro con dos asas altas y pelota en la corona
  intercontinental: {
    name: 'Copa Intercontinental',
    metal: 'gold',
    plinthColor: '#0b1018',
    plaques: { rows: 1, cols: 4 },
    plinth: {
      shape: 'round',
      steps: [
        [0.112, 0.028],
        [0.096, 0.044],
        [0.082, 0.014],
      ],
    },
    body: {
      outer: [
        [0, 0.076],
        [0.012, 0.076],
        [0.026, 0.058],
        [0.052, 0.026],
        [0.076, 0.019],
        [0.094, 0.032],
        [0.112, 0.02],
        [0.132, 0.036],
        [0.165, 0.096],
        [0.21, 0.138],
        [0.26, 0.156],
        [0.305, 0.162],
      ],
      inner: [
        [0.18, 0],
        [0.194, 0.068],
        [0.225, 0.122],
        [0.265, 0.144],
        [0.305, 0.151],
      ],
    },
    handles: { y: 0.248, R: 0.046, tube: 0.0105, arc: Math.PI * 1.3 },
    crownBall: { y: 0.272, r: 0.034 },
    spin: true,
    segments: 48,
    layout: { spacing: 0.8, maxPerRow: 4, rowGap: 0.5, rowRise: 0.08 },
  },

  // Copa Sudamericana: base con placas, fuste anillado de plata y gran globo superior con anillo inclinado
  sudamericana: {
    name: 'Copa Sudamericana',
    metal: 'silver',
    plinthColor: '#1b100b',
    plaques: { rows: 2, cols: 6 },
    plinth: {
      shape: 'round',
      steps: [
        [0.096, 0.026],
        [0.082, 0.052],
        [0.07, 0.014],
      ],
    },
    body: {
      outer: [
        [0, 0.064],
        [0.012, 0.064],
        [0.028, 0.048],
        [0.06, 0.028],
        [0.1, 0.024],
        [0.14, 0.034],
        [0.16, 0.024],
        [0.2, 0.026],
        [0.23, 0.038],
        [0.25, 0.028],
        [0.285, 0.036],
        [0.315, 0.058],
        [0.34, 0.044],
        [0.365, 0.076],
        [0.395, 0.098],
        [0.425, 0.096],
        [0.452, 0.074],
        [0.47, 0.038],
        [0.478, 0.012],
      ],
    },
    halo: { y: 0.41, R: 0.112, tube: 0.0085, tilt: 0.38 },
    ribs: { count: 8, y0: 0.04, y1: 0.31, r: 0.024, tube: 0.004 },
    spin: true,
    segments: 48,
    layout: { spacing: 0.72, maxPerRow: 4, rowGap: 0.36, rowRise: 0.08 },
  },

  // Copa Argentina: pedestal oscuro, fuste facetado de plata que se abre abrazando la pelota arriba
  'copa-argentina': {
    name: 'Copa Argentina',
    metal: 'silver',
    plinthColor: '#090c12',
    plaques: { rows: 1, cols: 6 },
    plinth: {
      shape: 'round',
      steps: [
        [0.102, 0.026],
        [0.088, 0.046],
        [0.074, 0.014],
      ],
    },
    body: {
      outer: [
        [0, 0.068],
        [0.012, 0.068],
        [0.028, 0.05],
        [0.056, 0.034],
        [0.095, 0.032],
        [0.135, 0.044],
        [0.175, 0.066],
        [0.21, 0.092],
        [0.242, 0.112],
        [0.262, 0.118],
      ],
      inner: [
        [0.19, 0],
        [0.202, 0.048],
        [0.225, 0.082],
        [0.246, 0.102],
        [0.262, 0.11],
      ],
    },
    flutes: { count: 10, y0: 0.03, y1: 0.252, r0: 0.034, r1: 0.108, tube: 0.005 },
    innerBall: { y: 0.22, r: 0.042 },
    spin: true,
    segments: 48,
    layout: { spacing: 0.62, maxPerRow: 6, rowGap: 0.42, rowRise: 0.08 },
  },

  // Primera División / Liga Profesional: son 36, van en 3 gradas de 12
  liga: {
    name: 'Primera División',
    metal: 'gold',
    plinthColor: '#1f1008',
    plinth: {
      shape: 'round',
      steps: [
        [0.046, 0.016],
        [0.039, 0.026],
      ],
    },
    body: {
      outer: [
        [0, 0.033],
        [0.006, 0.033],
        [0.014, 0.024],
        [0.026, 0.01],
        [0.046, 0.008],
        [0.062, 0.018],
        [0.082, 0.034],
        [0.1, 0.041],
        [0.114, 0.043],
      ],
      inner: [
        [0.074, 0],
        [0.082, 0.022],
        [0.1, 0.034],
        [0.114, 0.037],
      ],
    },
    ears: { y: 0.088, R: 0.011, tube: 0.0024 },
    segments: 28,
    detail: 0.6,
    layout: { spacing: 0.24, maxPerRow: 12, rowGap: 0.19, rowRise: 0.055 },
  },
}

/** Radio de la silueta exterior a una altura (sobre los nudos, sin muestrear) */
export function outerRadius(trophy) {
  const knots = trophy.body.outer
  return monotone(
    knots.map((k) => k[0]),
    knots.map((k) => k[1]),
  )
}

/**
 * Muestrea r(y) en n+1 puntos repartidos por longitud de arco (así los tramos
 * casi horizontales, como el fondo de una copa, no quedan facetados).
 * Devuelve [r, y] con y creciente.
 */
export function sampleSilhouette(knots, n) {
  const ys = knots.map((k) => k[0])
  const f = monotone(
    ys,
    knots.map((k) => k[1]),
  )
  const y0 = ys[0]
  const y1 = ys[ys.length - 1]
  const dense = 400
  const pts = []
  const acc = [0]
  for (let i = 0; i <= dense; i++) {
    const y = y0 + ((y1 - y0) * i) / dense
    pts.push([Math.max(0, f(y)), y])
    if (i) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  }
  const total = acc[dense]
  const out = []
  let i = 0
  for (let j = 0; j <= n; j++) {
    const s = (total * j) / n
    while (i < dense - 1 && acc[i + 1] < s) i++
    const span = acc[i + 1] - acc[i]
    const u = span > 0 ? Math.min(1, Math.max(0, (s - acc[i]) / span)) : 0
    out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u])
  }
  out[0] = pts[0]
  out[n] = pts[dense]
  return out
}

/**
 * Perfil completo del cuerpo metálico para LatheGeometry, como [x, y]:
 * eje abajo → afuera por el pie → sube por la pared → labio → (si es copa
 * abierta) baja por adentro hasta el eje.
 */
export function bodyProfile(trophy) {
  const k = trophy.detail ?? 1
  const outer = sampleSilhouette(trophy.body.outer, Math.round(64 * k))
  const pts = [[0, outer[0][1]], ...outer]
  if (trophy.body.inner) pts.push(...sampleSilhouette(trophy.body.inner, Math.round(28 * k)).reverse())
  else pts.push([0, outer[outer.length - 1][1]])
  return pts
}

/** Base escalonada: cada escalón [medio ancho, alto], de abajo hacia arriba */
export function plinthProfile(steps) {
  const pts = [[0, 0]]
  let y = 0
  for (const [w, h] of steps) {
    pts.push([w, y])
    y += h
    pts.push([w, y])
  }
  pts.push([0, y])
  return pts
}

export const plinthHeight = (trophy) => trophy.plinth.steps.reduce((s, [, h]) => s + h, 0)

/**
 * Duplica los vértices donde la silueta quiebra más que `deg` grados. LatheGeometry
 * promedia la normal de los dos tramos de cada punto: sin esto los bordes
 * (el pie, el labio, los escalones) quedarían blandos, como derretidos.
 */
export function sharpen(points, deg = 35) {
  const limit = Math.cos((deg * Math.PI) / 180)
  const out = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]
    const b = points[i]
    const c = points[i + 1]
    const ux = b[0] - a[0]
    const uy = b[1] - a[1]
    const vx = c[0] - b[0]
    const vy = c[1] - b[1]
    const lu = Math.hypot(ux, uy)
    const lv = Math.hypot(vx, vy)
    out.push(b)
    if (lu > 0 && lv > 0 && (ux * vx + uy * vy) / (lu * lv) < limit) out.push([b[0], b[1]])
  }
  out.push(points[points.length - 1])
  return out
}

/** Remache en cada punta del asa (radio, en caños): tapa el toro abierto */
export const RIVET = 1.35

/**
 * Dónde va cada asa: un arco de toro cuyas dos puntas apoyan sobre la pared
 * (a la altura y del centro del asa). Se busca la cuerda que mide lo que
 * pide el arco y se gira el toro para que quede perpendicular a ella.
 * Devuelve todo en el plano XY del lado +X (el otro lado es el espejo).
 */
export function handlePlacement(trophy) {
  const { y: cy, R, tube, arc } = trophy.handles
  const radius = outerRadius(trophy)
  const half = arc / 2
  const chord = 2 * R * Math.sin(half)
  let dy = chord / 2
  const ends = () => [
    [radius(cy + dy), cy + dy],
    [radius(cy - dy), cy - dy],
  ]
  for (let i = 0; i < 24; i++) {
    const [t, b] = ends()
    dy *= chord / Math.hypot(t[0] - b[0], t[1] - b[1])
  }
  const [top, bottom] = ends()
  const vx = top[0] - bottom[0]
  const vy = top[1] - bottom[1]
  const len = Math.hypot(vx, vy)
  const normal = [vy / len, -vx / len]
  const off = -Math.cos(half) * R
  const center = [(top[0] + bottom[0]) / 2 + normal[0] * off, (top[1] + bottom[1]) / 2 + normal[1] * off]
  const angle = Math.atan2(normal[1], normal[0])
  const rivet = tube * RIVET
  return {
    center,
    angle,
    R,
    tube,
    arc,
    rivet,
    ends: [top, bottom],
    apex: [center[0] + R * Math.cos(angle), center[1] + R * Math.sin(angle)],
    reach: Math.max(center[0] + R + tube, top[0] + rivet, bottom[0] + rivet),
    top: Math.max(center[1] + R + tube, top[1] + rivet),
  }
}

/** Filete y chapitas metálicas de la base */
export function plinthTrim(trophy) {
  const { steps, shape } = trophy.plinth
  let y = 0
  let tall = 0
  for (let i = 1; i < steps.length; i++) if (steps[i][1] > steps[tall][1]) tall = i
  for (let i = 0; i < tall; i++) y += steps[i][1]
  const [w, h] = steps[tall]
  if (shape === 'square') return { kind: 'plaque', w: w * 1.15, h: h * 0.36, y: y + h * 0.5, z: w + 0.0015 }
  const top = plinthHeight(trophy)
  const [wt] = steps[steps.length - 1]
  const band = Math.min(0.01, steps[steps.length - 1][1] * 0.3)
  return {
    kind: 'band',
    r: wt + 0.0012,
    y0: top - band * 1.6,
    y1: top - band * 0.6,
    tierR: w,
    tierY: y,
    tierH: h,
    plaques: trophy.plaques ?? null,
  }
}

/** Medidas que necesita el armado de los estantes */
export function trophyMetrics(trophy) {
  const ph = plinthHeight(trophy)
  const outer = trophy.body.outer
  let body = outer[outer.length - 1][0]
  let radius = Math.max(...outer.map((k) => k[1]))
  if (trophy.finial) body = Math.max(body, trophy.finial.y + trophy.finial.r)
  if (trophy.innerBall) body = Math.max(body, trophy.innerBall.y + trophy.innerBall.r)
  if (trophy.handles) {
    const h = handlePlacement(trophy)
    body = Math.max(body, h.top)
    radius = Math.max(radius, h.reach)
  }
  if (trophy.halo) {
    radius = Math.max(radius, trophy.halo.R + trophy.halo.tube)
  }
  const maxW = Math.max(...trophy.plinth.steps.map(([w]) => w))
  const plinthRadius = trophy.plinth.shape === 'square' ? maxW * Math.SQRT2 : maxW
  return { plinthHeight: ph, bodyHeight: body, height: ph + body, footprint: Math.max(radius, plinthRadius) }
}
