/**
 * La Bombonera en números: cancha, contorno de las tribunas, perfil de cada
 * bandeja, butacas y ubicaciones. Todo puro (sin three): lo usan la escena, la
 * cámara, el plano sin WebGL y los tests.
 *
 * Metros, origen en el centro de la cancha, x a lo largo (de arco a arco), z a
 * lo ancho, y hacia arriba. Tres lados son una U de tribunas con esquinas
 * curvas; el cuarto (z negativo) es el lado recto de los palcos, casi vertical:
 * la "caja de bombones". Es una maqueta estilizada: proporciones creíbles, no
 * un relevamiento.
 */

/** Medidas reglamentarias usuales de la cancha y sus líneas */
export const PITCH = {
  length: 105,
  width: 68,
  line: 0.12,
  circle: 9.15,
  penaltyDepth: 16.5,
  penaltyWidth: 40.32,
  goalAreaDepth: 5.5,
  goalAreaWidth: 18.32,
  spot: 11,
  corner: 1,
  goalWidth: 7.32,
  goalHeight: 2.44,
}

/** Aire entre la cancha y la primera fila, y radio de las esquinas de la U */
export const BOWL = { endGap: 5, sideGap: 4.5, corner: 13 }
export const HX = PITCH.length / 2 + BOWL.endGap // borde interior de las cabeceras
export const HZ = PITCH.width / 2 + BOWL.sideGap // borde interior del lateral y del lado recto
const R = BOWL.corner

/**
 * Las tres bandejas de la U. Cada fila k es un escalón: pisa de d0 + k·tread a
 * d0 + (k+1)·tread (d = distancia hacia afuera desde el borde interior) a la
 * altura y0 + k·riser. Cada bandeja vuela sobre la anterior: empinadas y
 * apiladas, como en la Bombonera.
 */
export const TIERS = [
  { id: 'baja', name: 'Bandeja baja', d0: 0, y0: 1.2, rows: 18, tread: 0.8, riser: 0.45, lip: 1.2 },
  { id: 'media', name: 'Bandeja media', d0: 9, y0: 12, rows: 16, tread: 0.75, riser: 0.55, lip: 1.4 },
  { id: 'alta', name: 'Bandeja alta', d0: 15, y0: 22.5, rows: 18, tread: 0.7, riser: 0.62, lip: 1.4 },
].map((t) => ({ ...t, dEnd: t.d0 + t.rows * t.tread, top: t.y0 + (t.rows - 1) * t.riser }))

/** Cielorraso bajo una bandeja voladiza: recta del pie de la baranda al fondo */
export function soffitAt(t, d) {
  const u = (d - t.d0) / (t.dEnd - t.d0)
  return t.y0 - t.lip + u * (t.top - 2 - (t.y0 - t.lip))
}

const LAST = TIERS[TIERS.length - 1]
/** Coronamiento de la U (donde van las luces) y la pared exterior */
export const ROOF = LAST.top + 2.5
export const OUTER = LAST.dEnd + 1.5

/** El lado recto: una platea baja y encima los palcos, nivel sobre nivel, casi a plomo */
export const FLAT = {
  platea: { d0: 0, y0: 1.2, rows: 12, tread: 0.8, riser: 0.42 },
  palcos: { levels: 6, y0: 7.6, height: 3.4, d0: 9.2, setback: 0.35, depth: 3.2, width: 3.8, rows: 2, perRow: 3 },
  back: 16, // profundidad total del edificio
}
FLAT.platea.dEnd = FLAT.platea.d0 + FLAT.platea.rows * FLAT.platea.tread
FLAT.platea.top = FLAT.platea.y0 + (FLAT.platea.rows - 1) * FLAT.platea.riser
FLAT.palcos.perLevel = Math.floor((2 * HX) / FLAT.palcos.width)
FLAT.roof = FLAT.palcos.y0 + FLAT.palcos.levels * FLAT.palcos.height

/** Frente del nivel l de palcos (cada nivel se corre apenas hacia atrás) */
export const palcoFront = (l) => FLAT.palcos.d0 + l * FLAT.palcos.setback
export const palcoFloor = (l) => FLAT.palcos.y0 + l * FLAT.palcos.height
/** x del centro del palco b de un nivel */
export const palcoCenter = (b) => -HX + (b + 0.5) * FLAT.palcos.width
/** Baranda del frente de los palcos (lo que queda debajo del vidrio) */
export const PALCO_RAIL = 0.8

export const SEAT = 0.5 // separación entre butacas (m)

/* ───────── El borde interior de la U: cinco tramos ───────── */

/**
 * Cabecera A (x−), curva, lateral (z+), curva, cabecera B (x+). Arranca y
 * termina contra el lado recto (z = −HZ). Normales hacia afuera, continuas.
 */
export const SEGMENTS = [
  { kind: 'line', from: [-HX, -HZ], to: [-HX, HZ - R], n: [-1, 0] },
  { kind: 'arc', c: [-HX + R, HZ - R], a0: Math.PI, a1: Math.PI / 2 },
  { kind: 'line', from: [-HX + R, HZ], to: [HX - R, HZ], n: [0, 1] },
  { kind: 'arc', c: [HX - R, HZ - R], a0: Math.PI / 2, a1: 0 },
  { kind: 'line', from: [HX, HZ - R], to: [HX, -HZ], n: [1, 0] },
]

/** Largo del tramo i corrido d metros hacia afuera */
export function segmentLength(i, d = 0) {
  const s = SEGMENTS[i]
  if (s.kind === 'arc') return (R + d) * Math.abs(s.a1 - s.a0)
  return Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1])
}

export const curveLength = (d = 0) => SEGMENTS.reduce((sum, _, i) => sum + segmentLength(i, d), 0)

/** Punto del tramo i en la fracción f (0..1), corrido d hacia afuera, con su normal */
export function pointOn(i, f, d = 0) {
  const s = SEGMENTS[i]
  if (s.kind === 'arc') {
    const a = s.a0 + (s.a1 - s.a0) * f
    const nx = Math.cos(a)
    const nz = Math.sin(a)
    return { x: s.c[0] + (R + d) * nx, z: s.c[1] + (R + d) * nz, nx, nz, seg: i, f }
  }
  const [nx, nz] = s.n
  return {
    x: s.from[0] + (s.to[0] - s.from[0]) * f + nx * d,
    z: s.from[1] + (s.to[1] - s.from[1]) * f + nz * d,
    nx,
    nz,
    seg: i,
    f,
  }
}

/** Punto a t metros del arranque, sobre la curva corrida d */
export function alongCurve(t, d = 0) {
  let rest = t
  for (let i = 0; i < SEGMENTS.length; i++) {
    const len = segmentLength(i, d)
    if (rest <= len || i === SEGMENTS.length - 1) return pointOn(i, Math.min(1, Math.max(0, rest / len)), d)
    rest -= len
  }
}

/** Lado de la U al que pertenece un punto: las esquinas se parten a la mitad */
export function sideOf(seg, f) {
  if (seg === 0 || (seg === 1 && f < 0.5)) return 'a'
  if (seg === 4 || (seg === 3 && f >= 0.5)) return 'b'
  return 'lateral'
}

/**
 * Muestras del borde de la U cada ~step metros (los extremos de cada tramo
 * siempre entran; las uniones no se repiten). { x, z, nx, nz, seg, f }
 */
export function pathSamples(step = 2, d = 0) {
  const out = []
  SEGMENTS.forEach((_, i) => {
    const n = Math.max(1, Math.ceil(segmentLength(i, d) / step))
    for (let j = i === 0 ? 0 : 1; j <= n; j++) out.push(pointOn(i, j / n, d))
  })
  return out
}

/** Contorno interior completo (U + lado recto), cerrado: el último punto repite el primero */
export function footprint(step = 2) {
  const pts = pathSamples(step).map((p) => [p.x, p.z])
  pts.push([...pts[0]])
  return pts
}

/** Banda de tribuna entre d0 y d1 (para el plano): ida por d0, vuelta por d1, cerrada */
export function bandOutline(d0, d1, step = 2) {
  const inner = pathSamples(step, d0).map((p) => [p.x, p.z])
  const outer = pathSamples(step, d1)
    .map((p) => [p.x, p.z])
    .reverse()
  const pts = [...inner, ...outer]
  pts.push([...pts[0]])
  return pts
}

/* ───────── Sectores (zonas) y butacas ───────── */

export const SIDES = { a: 'Cabecera Casa Amarilla', lateral: 'Lateral', b: 'Cabecera opuesta' }

/** Partición completa de la tribuna: cada butaca cae en exactamente una zona */
export const ZONES = [
  ...Object.entries(SIDES).flatMap(([side, sideName]) =>
    TIERS.map((t) => ({ id: `${side}-${t.id}`, name: `${sideName} · ${t.name.toLowerCase()}`, side, tier: t.id })),
  ),
  { id: 'recta-platea', name: 'Lado recto · platea', side: 'recta', tier: 'platea' },
  { id: 'recta-palcos', name: 'Lado recto · palcos', side: 'recta', tier: 'palcos' },
]
const ZONE_INDEX = new Map(ZONES.map((z, i) => [z.id, i]))
export const zoneById = (id) => ZONES[ZONE_INDEX.get(id)] ?? null

/** Butaca de la fila k de una bandeja de la U en (seg, f) */
function tierSeat(t, seg, f, k) {
  const d = t.d0 + (k + 0.5) * t.tread
  const p = pointOn(seg, f, d)
  return { x: p.x, y: t.y0 + k * t.riser, z: p.z, nx: p.nx, nz: p.nz }
}

/** Butaca del palco: nivel l, x, primera fila */
function palcoSeat(l, x) {
  return { x, y: palcoFloor(l) + 0.3, z: -HZ - (palcoFront(l) + 0.9), nx: 0, nz: -1 }
}

/** Butaca de la platea del lado recto, fila k */
function plateaSeat(k, x) {
  const p = FLAT.platea
  return { x, y: p.y0 + k * p.riser, z: -HZ - (p.d0 + (k + 0.5) * p.tread), nx: 0, nz: -1 }
}

/**
 * Todas las butacas, determinísticas. Arrays planos para instanciar:
 * positions (x, y, z), yaw (giro para mirar a la cancha) y zone (índice en ZONES).
 */
export function seatLayout() {
  const pos = []
  const yaw = []
  const zone = []
  const push = (s, zoneId) => {
    pos.push(s.x, s.y, s.z)
    yaw.push(Math.atan2(-s.nx, -s.nz))
    zone.push(ZONE_INDEX.get(zoneId))
  }
  for (const t of TIERS)
    for (let k = 0; k < t.rows; k++) {
      const d = t.d0 + (k + 0.5) * t.tread
      const L = curveLength(d)
      const n = Math.floor(L / SEAT)
      for (let i = 0; i < n; i++) {
        const p = alongCurve(((i + 0.5) / n) * L, d)
        push({ x: p.x, y: t.y0 + k * t.riser, z: p.z, nx: p.nx, nz: p.nz }, `${sideOf(p.seg, p.f)}-${t.id}`)
      }
    }
  const n = Math.floor((2 * HX) / SEAT)
  for (let k = 0; k < FLAT.platea.rows; k++)
    for (let i = 0; i < n; i++) push(plateaSeat(k, -HX + (i + 0.5) * SEAT), 'recta-platea')
  const P = FLAT.palcos
  for (let l = 0; l < P.levels; l++)
    for (let b = 0; b < P.perLevel; b++)
      for (let r = 0; r < P.rows; r++)
        for (let c = 0; c < P.perRow; c++) {
          const s = palcoSeat(l, -HX + (b + 0.5) * P.width + (c - (P.perRow - 1) / 2) * 0.62)
          push({ ...s, y: s.y + r * 0.35, z: s.z - r * 0.95 }, 'recta-palcos')
        }
  const counts = Object.fromEntries(ZONES.map((z) => [z.id, 0]))
  for (const i of zone) counts[ZONES[i].id]++
  return {
    count: zone.length,
    positions: Float32Array.from(pos),
    yaw: Float32Array.from(yaw),
    zone: Uint8Array.from(zone),
    counts,
  }
}

/* ───────── Ubicaciones para elegir ───────── */

const zAt0 = (seg) => (seg === 0 ? HZ / (2 * HZ - R) : (HZ - R) / (2 * HZ - R)) // fracción del tramo donde z = 0

/**
 * Las ubicaciones de la lista. `row` es la fracción de la bandeja (0 = primera
 * fila). Los palcos se ubican por nivel y por x.
 */
export const UBICACIONES = [
  {
    id: 'platea-baja',
    label: 'Platea baja',
    tier: 'baja',
    seg: 2,
    f: 0.5,
    row: 0.3,
    caption: 'Pegado al campo, en la primera bandeja del lateral: la cancha a la altura de los ojos y dos bandejas encima.',
  },
  {
    id: 'platea-alta',
    label: 'Platea alta',
    tier: 'alta',
    seg: 2,
    f: 0.5,
    row: 0.6,
    caption: 'En la bandeja más alta del lateral: la cancha entera abajo, como un tablero.',
  },
  {
    id: 'popular',
    label: 'Popular Casa Amarilla',
    note: 'La 12',
    tier: 'media',
    seg: 0,
    f: zAt0(0),
    row: 0.35,
    caption: 'Detrás del arco que da a Casa Amarilla, la popular donde alienta La 12.',
  },
  {
    id: 'palcos',
    label: 'Palcos',
    tier: 'palcos',
    level: 3,
    box: 12, // número de palco en el nivel: la butaca queda en el medio, lejos de los parantes
    caption: 'En el lado recto, el que le dio la forma de caja de bombones: palcos apilados casi a plomo sobre la línea de cal.',
  },
  {
    id: 'cabecera',
    label: 'Cabecera opuesta',
    tier: 'alta',
    seg: 4,
    f: zAt0(4),
    row: 0.55,
    caption: 'En lo alto de la otra cabecera: todo el largo de la cancha por delante.',
  },
]

/** Butaca de una ubicación de la lista, con su zona */
export function spotSeat(u) {
  if (u.tier === 'palcos') return { ...palcoSeat(u.level, palcoCenter(u.box)), zone: 'recta-palcos' }
  const t = TIERS.find((x) => x.id === u.tier)
  const k = Math.round(u.row * (t.rows - 1))
  return { ...tierSeat(t, u.seg, u.f, k), zone: `${sideOf(u.seg, u.f)}-${t.id}` }
}

/** Proyecta (x, z) sobre el borde de la U: tramo, fracción y distancia hacia afuera */
export function projectToCurve(x, z) {
  let best = null
  const consider = (seg, f, d) => {
    if (f < -1e-9 || f > 1 + 1e-9) return
    if (!best || Math.abs(d) < Math.abs(best.d)) best = { seg, f: Math.min(1, Math.max(0, f)), d }
  }
  SEGMENTS.forEach((s, i) => {
    if (s.kind === 'line') {
      const dx = s.to[0] - s.from[0]
      const dz = s.to[1] - s.from[1]
      const len2 = dx * dx + dz * dz
      const f = ((x - s.from[0]) * dx + (z - s.from[1]) * dz) / len2
      const d = (x - s.from[0]) * s.n[0] + (z - s.from[1]) * s.n[1]
      consider(i, f, d)
    } else {
      const a = Math.atan2(z - s.c[1], x - s.c[0])
      const f = (a - s.a0) / (s.a1 - s.a0)
      consider(i, f, Math.hypot(x - s.c[0], z - s.c[1]) - R)
    }
  })
  return best
}

/**
 * Qué lugar de la tribuna hay en un punto (por ejemplo, donde pegó un clic).
 * Devuelve { zone, name, seat } con la butaca más cercana, o null si el
 * punto no está sobre una tribuna.
 */
export function zoneAt(x, y, z) {
  const named = (zone, seat) => ({ zone, name: zoneById(zone).name, seat })
  // lado recto
  if (z <= -HZ + 0.05 && Math.abs(x) <= HX) {
    const d = -HZ - z
    const sx = Math.max(-HX + SEAT / 2, Math.min(HX - SEAT / 2, x))
    if (y >= FLAT.palcos.y0 - 0.2) {
      const l = Math.max(0, Math.min(FLAT.palcos.levels - 1, Math.floor((y - FLAT.palcos.y0) / FLAT.palcos.height)))
      const b = Math.max(0, Math.min(FLAT.palcos.perLevel - 1, Math.floor((x + HX) / FLAT.palcos.width)))
      return named('recta-palcos', palcoSeat(l, palcoCenter(b)))
    }
    const p = FLAT.platea
    if (d < -0.5 || d > p.dEnd + 0.5) return null
    const k = Math.max(0, Math.min(p.rows - 1, Math.floor((d - p.d0) / p.tread)))
    return named('recta-platea', plateaSeat(k, sx))
  }
  const proj = projectToCurve(x, z)
  if (!proj || proj.d < -0.5) return null
  let pick = null
  for (const t of TIERS) {
    if (proj.d < t.d0 - 0.5 || proj.d > t.dEnd + 0.5) continue
    const k = Math.max(0, Math.min(t.rows - 1, Math.floor((proj.d - t.d0) / t.tread)))
    const gap = Math.abs(y - (t.y0 + k * t.riser))
    if (!pick || gap < pick.gap) pick = { t, k, gap }
  }
  if (!pick) return null
  return named(`${sideOf(proj.seg, proj.f)}-${pick.t.id}`, tierSeat(pick.t, proj.seg, proj.f, pick.k))
}

/** Punto en el plano xz dentro de un polígono cerrado (par-impar) */
export function insidePolygon([x, z], poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]
    const [xj, zj] = poly[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}
