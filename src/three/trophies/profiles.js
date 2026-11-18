import { monotone } from './spline'

/**
 * Trofeos de la Vitrina, hechos por código (sin modelos de terceros). Cada uno
 * es una silueta que gira alrededor del eje Y (LatheGeometry) más detalles:
 * asas (toros), una pelota arriba y una base escalonada laqueada.
 *
 * Unidades: metros "de vitrina". Las siluetas se escriben como nudos [y, r]
 * (altura, radio) con y creciente; una cúbica monótona los une sin pasarse, así
 * el radio nunca se vuelve negativo ni la pared se cruza consigo misma.
 * Este módulo no importa three: se prueba en node (trophies.test.js).
 */
export const TROPHIES = {
  // Alta y fina, sobre una base alta de madera laqueada, con tapa y pelota arriba
  libertadores: {
    name: 'Copa Libertadores',
    plinth: { shape: 'square', steps: [[0.1, 0.035], [0.084, 0.13], [0.07, 0.018]] },
    body: {
      outer: [
        [0, 0.06],
        [0.01, 0.06],
        [0.022, 0.05],
        [0.048, 0.022],
        [0.072, 0.015],
        [0.088, 0.028],
        [0.104, 0.015],
        [0.15, 0.018],
        [0.175, 0.032],
        [0.215, 0.06],
        [0.265, 0.078],
        [0.33, 0.07],
        [0.372, 0.064],
        [0.392, 0.078],
        [0.402, 0.074],
        [0.42, 0.06],
        [0.442, 0.034],
        [0.456, 0.014],
        [0.474, 0.012],
      ],
    },
    finial: { y: 0.504, r: 0.034 },
    segments: 48,
    layout: { spacing: 0.44, maxPerRow: 8, rowGap: 0.36, rowRise: 0.08 },
  },
  // Copa ancha de dos asas, sobre mármol negro
  intercontinental: {
    name: 'Copa Intercontinental',
    plinth: { shape: 'round', steps: [[0.115, 0.03], [0.1, 0.04]] },
    body: {
      outer: [
        [0, 0.078],
        [0.01, 0.078],
        [0.024, 0.062],
        [0.05, 0.03],
        [0.078, 0.02],
        [0.094, 0.032],
        [0.11, 0.021],
        [0.128, 0.034],
        [0.16, 0.095],
        [0.205, 0.14],
        [0.255, 0.158],
        [0.3, 0.165],
      ],
      inner: [
        [0.172, 0],
        [0.185, 0.07],
        [0.215, 0.125],
        [0.26, 0.146],
        [0.3, 0.154],
      ],
    },
    handles: { y: 0.252, R: 0.046, tube: 0.011, arc: Math.PI * 1.3 },
    spin: true,
    segments: 48,
    layout: { spacing: 0.8, maxPerRow: 4, rowGap: 0.5, rowRise: 0.08 },
  },
  // Muy alta y delgada, con la boca abierta en trompeta
  sudamericana: {
    name: 'Copa Sudamericana',
    plinth: { shape: 'round', steps: [[0.088, 0.028], [0.072, 0.05]] },
    body: {
      outer: [
        [0, 0.056],
        [0.01, 0.056],
        [0.022, 0.044],
        [0.045, 0.02],
        [0.12, 0.016],
        [0.24, 0.014],
        [0.262, 0.026],
        [0.284, 0.014],
        [0.35, 0.018],
        [0.405, 0.04],
        [0.44, 0.078],
        [0.462, 0.112],
        [0.475, 0.128],
      ],
      inner: [
        [0.43, 0],
        [0.442, 0.04],
        [0.455, 0.085],
        [0.468, 0.11],
        [0.475, 0.118],
      ],
    },
    segments: 48,
    layout: { spacing: 0.72, maxPerRow: 4, rowGap: 0.36, rowRise: 0.08 },
  },
  // Petisa y panzona, con dos asas grandes como orejas
  'copa-argentina': {
    name: 'Copa Argentina',
    plinth: { shape: 'round', steps: [[0.105, 0.028], [0.09, 0.034]] },
    body: {
      outer: [
        [0, 0.07],
        [0.01, 0.07],
        [0.02, 0.058],
        [0.036, 0.034],
        [0.052, 0.026],
        [0.066, 0.05],
        [0.09, 0.098],
        [0.125, 0.12],
        [0.165, 0.117],
        [0.195, 0.104],
        [0.212, 0.11],
        [0.222, 0.116],
      ],
      inner: [
        [0.082, 0],
        [0.095, 0.06],
        [0.12, 0.1],
        [0.165, 0.104],
        [0.195, 0.093],
        [0.222, 0.106],
      ],
    },
    handles: { y: 0.14, R: 0.052, tube: 0.01, arc: Math.PI * 1.35 },
    spin: true,
    segments: 48,
    layout: { spacing: 0.62, maxPerRow: 6, rowGap: 0.42, rowRise: 0.08 },
  },
  // Copita chica: son 36, van en gradas de 12
  liga: {
    name: 'Primera División',
    plinth: { shape: 'round', steps: [[0.046, 0.016], [0.039, 0.026]] },
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
 * Perfil completo del cuerpo dorado para LatheGeometry, como [x, y]:
 * eje abajo → afuera por el pie → sube por la pared → labio → (si es copa
 * abierta) baja por adentro hasta el eje. Recorrerlo en ese sentido deja las
 * normales hacia afuera por fuera y hacia el hueco por dentro.
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
    // el punto más afuera del asa (la mitad del arco)
    apex: [center[0] + R * Math.cos(angle), center[1] + R * Math.sin(angle)],
    reach: Math.max(center[0] + R + tube, top[0] + rivet, bottom[0] + rivet),
    top: Math.max(center[1] + R + tube, top[1] + rivet),
  }
}


/** Filete dorado de la base: aro en las redondas, placa al frente en las cuadradas */
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
  return { kind: 'band', r: wt + 0.0012, y0: top - band * 1.6, y1: top - band * 0.6 }
}

/** Medidas que necesita el armado de los estantes */
export function trophyMetrics(trophy) {
  const ph = plinthHeight(trophy)
  const outer = trophy.body.outer
  let body = outer[outer.length - 1][0]
  let radius = Math.max(...outer.map((k) => k[1]))
  if (trophy.finial) body = Math.max(body, trophy.finial.y + trophy.finial.r)
  if (trophy.handles) {
    const h = handlePlacement(trophy)
    body = Math.max(body, h.top)
    radius = Math.max(radius, h.reach)
  }
  const maxW = Math.max(...trophy.plinth.steps.map(([w]) => w))
  const plinthRadius = trophy.plinth.shape === 'square' ? maxW * Math.SQRT2 : maxW
  return { plinthHeight: ph, bodyHeight: body, height: ph + body, footprint: Math.max(radius, plinthRadius) }
}
