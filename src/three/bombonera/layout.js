/**
 * La Bombonera en números: cancha, contorno de las tribunas, perfil de cada
 * bandeja, túnel de salida, sectores de ticketing con precios, butacas y
 * ubicaciones. Todo puro (sin three): lo usan la escena, la cámara, el plano
 * sin WebGL y los tests.
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

/** Túnel de salida de los jugadores bajo el lado recto hacia el centro del campo */
export const TUNNEL = {
  width: 6.2,
  height: 3.4,
  length: 18,
  z0: -HZ,
  z1: -HZ - 18,
}

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

/** Distancia acumulada en la curva base (d = 0) para un par (seg, f) */
export function curveOffsetOf(seg, f, d = 0) {
  let sum = 0
  for (let i = 0; i < seg; i++) sum += segmentLength(i, d)
  return sum + segmentLength(seg, d) * Math.min(1, Math.max(0, f))
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

/* ───────── Sectores (zonas), bloques de ticketing y butacas ───────── */

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

/** Formato de moneda ARS para los tickets */
export function formatArs(amount) {
  return `$${Math.round(amount).toLocaleString('es-AR')}`
}

/**
 * Fracciones simétricas a lo largo de la U donde corren los pasillos radiales.
 * Dividen cada lado (Cabecera A, Lateral, Cabecera B) en 3 bloques arquitectónicos
 * (9 bloques por bandeja × 3 bandejas = 27 sectores en la U + 6 en el lado recto = 33).
 */
const L0 = curveLength(0)
const SIDE_A_END = (segmentLength(0, 0) + segmentLength(1, 0) * 0.5) / L0
const SIDE_B_START = 1 - SIDE_A_END

export const U_BLOCK_BOUNDS = [
  0,
  SIDE_A_END / 3,
  (2 * SIDE_A_END) / 3,
  SIDE_A_END,
  SIDE_A_END + (SIDE_B_START - SIDE_A_END) / 3,
  SIDE_A_END + (2 * (SIDE_B_START - SIDE_A_END)) / 3,
  SIDE_B_START,
  SIDE_B_START + (1 - SIDE_B_START) / 3,
  SIDE_B_START + (2 * (1 - SIDE_B_START)) / 3,
  1,
]

/** Pasillos radiales interiores de la U (excluye los dos bordes contra el lado recto) */
export const AISLE_FRACTIONS = U_BLOCK_BOUNDS.slice(1, -1)

const U_BLOCK_META = [
  { code: 'N1', side: 'a', subName: 'Esquina Palcos · Norte', gate: 'Puerta 12 · Brandsen 805' },
  { code: 'N2', side: 'a', subName: 'Popular Casa Amarilla · La 12', gate: 'Puerta 14 · Casa Amarilla' },
  { code: 'N3', side: 'a', subName: 'Codo Norte · Iberlucea', gate: 'Puerta 11 · Del Valle Iberlucea' },
  { code: 'L1', side: 'lateral', subName: 'Platea Lateral · Norte', gate: 'Puerta 9 · Del Valle Iberlucea' },
  { code: 'L2', side: 'lateral', subName: 'Platea Preferencial · Central', gate: 'Puerta 7 · Del Valle Iberlucea' },
  { code: 'L3', side: 'lateral', subName: 'Platea Lateral · Sur', gate: 'Puerta 6 · Del Valle Iberlucea' },
  { code: 'S1', side: 'b', subName: 'Codo Sur · Riachuelo', gate: 'Puerta 4 · Aristóbulo del Valle' },
  { code: 'S2', side: 'b', subName: 'Cabecera Sur · Riachuelo', gate: 'Puerta 3 · Aristóbulo del Valle' },
  { code: 'S3', side: 'b', subName: 'Esquina Palcos · Sur', gate: 'Puerta 2 · Brandsen 805' },
]

const TIER_TICKET_META = {
  baja: {
    badge: 'BANDEJA BAJA',
    basePrice: { a: 42000, lateral: 85000, b: 40000 },
    available: [14, 18, 16, 22, 12, 24, 19, 28, 15],
  },
  media: {
    badge: 'BANDEJA MEDIA · SUITES',
    basePrice: { a: 36000, lateral: 110000, b: 36000 },
    available: [9, 6, 11, 14, 8, 15, 17, 21, 12],
  },
  alta: {
    badge: 'BANDEJA ALTA',
    basePrice: { a: 28000, lateral: 52000, b: 28000 },
    available: [26, 19, 24, 32, 21, 29, 34, 38, 27],
  },
}

/** Contorno 3D cerrado de un bloque de la U para iluminar su borde en hover (estilo Reel) */
function buildUSectionOutline(t, u0, u1) {
  const steps = 10
  const yFront = t.y0 + 0.18
  const yBack = t.top + 0.95
  const LFront = curveLength(t.d0)
  const LBack = curveLength(t.dEnd)
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const u = u0 + ((u1 - u0) * i) / steps
    const p = alongCurve(u * LFront, t.d0)
    pts.push([p.x, yFront, p.z])
  }
  for (let k = 1; k <= 5; k++) {
    const f = k / 5
    const d = t.d0 + (t.dEnd - t.d0) * f
    const y = yFront + (yBack - yFront) * f
    const p = alongCurve(u1 * curveLength(d), d)
    pts.push([p.x, y, p.z])
  }
  for (let i = steps - 1; i >= 0; i--) {
    const u = u0 + ((u1 - u0) * i) / steps
    const p = alongCurve(u * LBack, t.dEnd)
    pts.push([p.x, yBack, p.z])
  }
  for (let k = 4; k >= 0; k--) {
    const f = k / 5
    const d = t.d0 + (t.dEnd - t.d0) * f
    const y = yFront + (yBack - yFront) * f
    const p = alongCurve(u0 * curveLength(d), d)
    pts.push([p.x, y, p.z])
  }
  return pts
}

/** Contorno 3D cerrado de un bloque del lado recto (platea o palcos) */
function buildFlatSectionOutline(x0, x1, zFront, zBack, y0, y1) {
  return [
    [x0, y0, zFront],
    [(x0 + x1) / 2, y0, zFront],
    [x1, y0, zFront],
    [x1, (y0 + y1) / 2, (zFront + zBack) / 2],
    [x1, y1, zBack],
    [(x0 + x1) / 2, y1, zBack],
    [x0, y1, zBack],
    [x0, (y0 + y1) / 2, (zFront + zBack) / 2],
    [x0, y0, zFront],
  ]
}

/** Construye los 33 bloques interactivos de ticketing con sus butacas destacadas y bordes 3D */
function buildTicketSections() {
  const sections = []

  // 27 bloques en la U (3 bandejas × 9 bloques perimetrales)
  TIERS.forEach((t) => {
    const tMeta = TIER_TICKET_META[t.id]
    for (let b = 0; b < 9; b++) {
      const u0 = U_BLOCK_BOUNDS[b]
      const u1 = U_BLOCK_BOUNDS[b + 1]
      const uMid = (u0 + u1) / 2
      const bMeta = U_BLOCK_META[b]
      const zoneId = `${bMeta.side}-${t.id}`
      const isCenter = b === 1 || b === 4 || b === 7
      const price = tMeta.basePrice[bMeta.side] + (isCenter ? 8000 : 0)
      const id = `${zoneId}-${bMeta.code.toLowerCase()}`
      const code = `${bMeta.code} · ${t.id.toUpperCase()}`

      // Butacas destacadas dentro del bloque para elegir en el zoom de sector
      const featuredSeats = []
      const rowFracs = [0.22, 0.5, 0.78]
      const colFracs = [0.35, 0.5, 0.65]
      let idx = 0
      for (const rf of rowFracs) {
        const k = Math.max(0, Math.min(t.rows - 1, Math.round(rf * (t.rows - 1))))
        const d = t.d0 + (k + 0.5) * t.tread
        const L = curveLength(d)
        for (const cf of colFracs) {
          const u = u0 + (u1 - u0) * cf
          const p = alongCurve(u * L, d)
          const rowNum = k + 1
          const seatNum = Math.max(1, Math.round(cf * 28) + b * 10)
          const rowBonus = Math.round((1 - rf) * 6000)
          const seatPrice = price + rowBonus
          featuredSeats.push({
            id: `${id}-f${rowNum}-a${seatNum}`,
            sectionId: id,
            sectionCode: code,
            zone: zoneId,
            x: p.x,
            y: t.y0 + k * t.riser,
            z: p.z,
            nx: p.nx,
            nz: p.nz,
            yaw: Math.atan2(-p.nx, -p.nz),
            rowNumber: rowNum,
            seatNumber: seatNum,
            price: seatPrice,
            priceLabel: formatArs(seatPrice),
            gate: bMeta.gate,
          })
          idx++
        }
      }
      const centerSeat = featuredSeats[4] || featuredSeats[0]

      sections.push({
        id,
        code,
        name: `${bMeta.subName} · ${t.name}`,
        shortName: bMeta.subName,
        tierName: t.name,
        badge: tMeta.badge,
        zone: zoneId,
        side: bMeta.side,
        tier: t.id,
        blockIndex: b,
        u0,
        u1,
        uMid,
        price,
        priceLabel: formatArs(price),
        available: tMeta.available[b],
        gate: bMeta.gate,
        centerSeat,
        featuredSeats,
        outline3D: buildUSectionOutline(t, u0, u1),
      })
    }
  })

  // 3 bloques en Lado Recto · Platea Preferencial
  const P = FLAT.platea
  const flatBlocks = [
    { code: 'P1', subName: 'Platea Lado Recto · Norte', x0: -HX, x1: -HX / 3, price: 92000, available: 16, gate: 'Puerta 17 · Brandsen 805' },
    { code: 'P2', subName: 'Platea Lado Recto · Central', x0: -HX / 3, x1: HX / 3, price: 105000, available: 11, gate: 'Puerta 18 · Brandsen 805' },
    { code: 'P3', subName: 'Platea Lado Recto · Sur', x0: HX / 3, x1: HX, price: 92000, available: 19, gate: 'Puerta 19 · Brandsen 805' },
  ]
  flatBlocks.forEach((fb, b) => {
    const id = `recta-platea-${fb.code.toLowerCase()}`
    const code = `${fb.code} · PLATEA RECTA`
    const featuredSeats = []
    for (const rf of [0.25, 0.55, 0.82]) {
      const k = Math.max(0, Math.min(P.rows - 1, Math.round(rf * (P.rows - 1))))
      for (const cf of [0.3, 0.5, 0.7]) {
        const x = fb.x0 + (fb.x1 - fb.x0) * cf
        const s = plateaSeat(k, x)
        const rowNum = k + 1
        const seatNum = Math.round(cf * 24) + b * 20
        const seatPrice = fb.price + Math.round((1 - rf) * 5000)
        featuredSeats.push({
          id: `${id}-f${rowNum}-a${seatNum}`,
          sectionId: id,
          sectionCode: code,
          zone: 'recta-platea',
          ...s,
          yaw: Math.atan2(-s.nx, -s.nz),
          rowNumber: rowNum,
          seatNumber: seatNum,
          price: seatPrice,
          priceLabel: formatArs(seatPrice),
          gate: fb.gate,
        })
      }
    }
    sections.push({
      id,
      code,
      name: `${fb.subName} · Lado recto`,
      shortName: fb.subName,
      tierName: 'Platea Preferencial',
      badge: 'PLATEA PREFERENCIAL',
      zone: 'recta-platea',
      side: 'recta',
      tier: 'platea',
      blockIndex: b,
      x0: fb.x0,
      x1: fb.x1,
      price: fb.price,
      priceLabel: formatArs(fb.price),
      available: fb.available,
      gate: fb.gate,
      centerSeat: featuredSeats[4],
      featuredSeats,
      outline3D: buildFlatSectionOutline(fb.x0, fb.x1, -HZ - P.d0, -HZ - P.dEnd, P.y0 + 0.15, P.top + 0.8),
    })
  })

  // 3 bloques en Lado Recto · Palcos VIP ("La Caja de Bombones")
  const L = FLAT.palcos
  const palcoBlocks = [
    { code: 'VIP-1', subName: 'Palcos Torres · Norte', b0: 0, b1: Math.floor(L.perLevel / 3), price: 140000, available: 6, gate: 'Puerta 18 · Hall VIP Norte' },
    { code: 'VIP-2', subName: 'Palcos Presidenciales · Central', b0: Math.floor(L.perLevel / 3), b1: Math.floor((2 * L.perLevel) / 3), price: 165000, available: 4, gate: 'Puerta 18 · Ascensor Presidencial' },
    { code: 'VIP-3', subName: 'Palcos Torres · Sur', b0: Math.floor((2 * L.perLevel) / 3), b1: L.perLevel, price: 140000, available: 8, gate: 'Puerta 19 · Hall VIP Sur' },
  ]
  palcoBlocks.forEach((pb, idx) => {
    const id = `recta-palcos-vip${idx + 1}`
    const code = `${pb.code} · PALCOS`
    const x0 = -HX + pb.b0 * L.width
    const x1 = -HX + pb.b1 * L.width
    const featuredSeats = []
    for (const lvl of [1, 2, 3, 4]) {
      for (const frac of [0.3, 0.5, 0.7]) {
        const box = Math.max(pb.b0, Math.min(pb.b1 - 1, Math.floor(pb.b0 + (pb.b1 - pb.b0) * frac)))
        const s = palcoSeat(lvl, palcoCenter(box))
        const seatPrice = pb.price + (lvl === 2 || lvl === 3 ? 12000 : 0)
        featuredSeats.push({
          id: `${id}-n${lvl + 1}-p${box + 1}`,
          sectionId: id,
          sectionCode: code,
          zone: 'recta-palcos',
          ...s,
          yaw: 0,
          rowNumber: lvl + 1,
          seatNumber: box + 1,
          price: seatPrice,
          priceLabel: formatArs(seatPrice),
          gate: pb.gate,
        })
      }
    }
    sections.push({
      id,
      code,
      name: `${pb.subName} · Lado recto`,
      shortName: pb.subName,
      tierName: 'Palcos VIP',
      badge: 'PALCOS VIP · LADO RECTO',
      zone: 'recta-palcos',
      side: 'recta',
      tier: 'palcos',
      blockIndex: idx,
      x0,
      x1,
      b0: pb.b0,
      b1: pb.b1,
      price: pb.price,
      priceLabel: formatArs(pb.price),
      available: pb.available,
      gate: pb.gate,
      centerSeat: featuredSeats[4] || featuredSeats[0],
      featuredSeats,
      outline3D: buildFlatSectionOutline(
        x0,
        x1,
        -HZ - palcoFront(0),
        -HZ - palcoFront(L.levels - 1) - 1.2,
        palcoFloor(0),
        FLAT.roof,
      ),
    })
  })

  return sections
}

export const SECTIONS = buildTicketSections()
const SECTION_BY_ID = new Map(SECTIONS.map((s) => [s.id, s]))
export const sectionById = (id) => SECTION_BY_ID.get(id) ?? null

/** Determina si una fracción u (0..1) sobre la U cae en un pasillo radial (simétrico) */
export function isAisleFraction(u, halfWidth = 0.0042) {
  for (let i = 0; i < AISLE_FRACTIONS.length; i++) {
    if (Math.abs(u - AISLE_FRACTIONS[i]) < halfWidth) return true
  }
  return false
}

/**
 * Todas las butacas, determinísticas. Arrays planos para instanciar:
 * positions (x, y, z), yaw (giro para mirar a la cancha) y zone (índice en ZONES).
 * Incluye pasillos radiales simétricos para que los bloques de tribuna se vean
 * arquitectónicos y las dos cabeceras mantengan exactamente la misma cantidad.
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
        const u = (i + 0.5) / n
        if (isAisleFraction(u, 0.0038)) continue
        const p = alongCurve(u * L, d)
        push({ x: p.x, y: t.y0 + k * t.riser, z: p.z, nx: p.nx, nz: p.nz }, `${sideOf(p.seg, p.f)}-${t.id}`)
      }
    }
  const n = Math.floor((2 * HX) / SEAT)
  for (let k = 0; k < FLAT.platea.rows; k++)
    for (let i = 0; i < n; i++) {
      const x = -HX + (i + 0.5) * SEAT
      // boca del túnel central en las primeras filas y pasillos de platea
      if (k < 7 && Math.abs(x) < TUNNEL.width * 0.55) continue
      if (Math.abs(Math.abs(x) - HX / 3) < 0.38) continue
      push(plateaSeat(k, x), 'recta-platea')
    }
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
    price: 93000,
    sectionCode: 'L2 · BAJA',
    gate: 'Puerta 7 · Del Valle Iberlucea',
    caption: 'Pegado al campo, en la primera bandeja del lateral: la cancha a la altura de los ojos y dos bandejas encima.',
  },
  {
    id: 'platea-alta',
    label: 'Platea alta',
    tier: 'alta',
    seg: 2,
    f: 0.5,
    row: 0.6,
    price: 60000,
    sectionCode: 'L2 · ALTA',
    gate: 'Puerta 8 · Del Valle Iberlucea',
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
    price: 44000,
    sectionCode: 'N2 · MEDIA',
    gate: 'Puerta 14 · Casa Amarilla',
    caption: 'Detrás del arco que da a Casa Amarilla, la popular donde alienta La 12.',
  },
  {
    id: 'palcos',
    label: 'Palcos',
    note: 'VIP',
    tier: 'palcos',
    level: 3,
    box: 12, // número de palco en el nivel: la butaca queda en el medio, lejos de los parantes
    price: 165000,
    sectionCode: 'VIP-2 · PALCOS',
    gate: 'Puerta 18 · Hall Presidencial',
    caption: 'En el lado recto, el que le dio la forma de caja de bombones: palcos apilados casi a plomo sobre la línea de cal.',
  },
  {
    id: 'cabecera',
    label: 'Cabecera opuesta',
    tier: 'alta',
    seg: 4,
    f: zAt0(4),
    row: 0.55,
    price: 36000,
    sectionCode: 'S2 · ALTA',
    gate: 'Puerta 3 · Aristóbulo del Valle',
    caption: 'En lo alto de la otra cabecera: todo el largo de la cancha por delante.',
  },
]

/** Encuentra el bloque de ticketing (SECTIONS) para una zona y posición */
export function findSectionFor(zoneId, { seg, f, x, box } = {}) {
  if (zoneId === 'recta-palcos') {
    const b = box ?? Math.max(0, Math.min(FLAT.palcos.perLevel - 1, Math.floor(((x ?? 0) + HX) / FLAT.palcos.width)))
    return (
      SECTIONS.find((s) => s.zone === 'recta-palcos' && b >= s.b0 && b < s.b1) ||
      SECTIONS.find((s) => s.zone === 'recta-palcos')
    )
  }
  if (zoneId === 'recta-platea') {
    const px = x ?? 0
    return (
      SECTIONS.find((s) => s.zone === 'recta-platea' && px >= s.x0 - 0.01 && px <= s.x1 + 0.01) ||
      SECTIONS.find((s) => s.zone === 'recta-platea')
    )
  }
  const u = seg != null && f != null ? curveOffsetOf(seg, f, 0) / L0 : 0.5
  return (
    SECTIONS.find((s) => s.zone === zoneId && u >= s.u0 - 1e-4 && u <= s.u1 + 1e-4) ||
    SECTIONS.find((s) => s.zone === zoneId)
  )
}

/** Butaca de una ubicación de la lista, con su zona y datos de ticket */
export function spotSeat(u) {
  if (u.tier === 'palcos') {
    const base = palcoSeat(u.level, palcoCenter(u.box))
    const sec = findSectionFor('recta-palcos', { box: u.box, x: base.x })
    const price = u.price ?? sec?.price ?? 165000
    return {
      ...base,
      zone: 'recta-palcos',
      sectionId: sec?.id ?? 'recta-palcos-vip2',
      sectionCode: u.sectionCode ?? sec?.code ?? 'VIP-2 · PALCOS',
      rowNumber: u.level + 1,
      seatNumber: u.box + 1,
      price,
      priceLabel: formatArs(price),
      gate: u.gate ?? sec?.gate ?? 'Puerta 18 · Brandsen 805',
    }
  }
  const t = TIERS.find((x) => x.id === u.tier)
  const k = Math.round(u.row * (t.rows - 1))
  const base = tierSeat(t, u.seg, u.f, k)
  const zone = `${sideOf(u.seg, u.f)}-${t.id}`
  const sec = findSectionFor(zone, { seg: u.seg, f: u.f })
  const price = u.price ?? sec?.price ?? 60000
  return {
    ...base,
    zone,
    sectionId: sec?.id ?? `${zone}-c`,
    sectionCode: u.sectionCode ?? sec?.code ?? zone.toUpperCase(),
    rowNumber: k + 1,
    seatNumber: Math.max(1, Math.round(u.f * 24) + 4),
    price,
    priceLabel: formatArs(price),
    gate: u.gate ?? sec?.gate ?? 'Puerta 7 · Brandsen 805',
  }
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
 * Devuelve { zone, name, seat, section, sectionId, priceLabel, available, ... }
 * con la butaca más cercana, o null si el punto no está sobre una tribuna.
 */
export function zoneAt(x, y, z) {
  const enrich = (zone, rawSeat, sec, rowNumber, seatNumber) => {
    const price = sec ? sec.price : 65000
    const seat = {
      ...rawSeat,
      zone,
      sectionId: sec?.id ?? zone,
      sectionCode: sec?.code ?? zone.toUpperCase(),
      rowNumber,
      seatNumber,
      price,
      priceLabel: formatArs(price),
      gate: sec?.gate ?? 'Puerta 12 · Brandsen 805',
    }
    return {
      zone,
      name: zoneById(zone).name,
      sectionId: sec?.id ?? zone,
      sectionCode: sec?.code ?? zone.toUpperCase(),
      sectionName: sec?.name ?? zoneById(zone).name,
      shortName: sec?.shortName ?? zoneById(zone).name,
      badge: sec?.badge ?? 'TRIBUNA',
      price,
      priceLabel: formatArs(price),
      available: sec?.available ?? 12,
      gate: sec?.gate ?? 'Puerta 12 · Brandsen 805',
      rowNumber,
      seatNumber,
      section: sec,
      seat,
    }
  }

  // lado recto
  if (z <= -HZ + 0.05 && Math.abs(x) <= HX) {
    const d = -HZ - z
    const sx = Math.max(-HX + SEAT / 2, Math.min(HX - SEAT / 2, x))
    if (y >= FLAT.palcos.y0 - 0.2) {
      const l = Math.max(0, Math.min(FLAT.palcos.levels - 1, Math.floor((y - FLAT.palcos.y0) / FLAT.palcos.height)))
      const b = Math.max(0, Math.min(FLAT.palcos.perLevel - 1, Math.floor((x + HX) / FLAT.palcos.width)))
      const sec = findSectionFor('recta-palcos', { box: b, x: sx })
      return enrich('recta-palcos', palcoSeat(l, palcoCenter(b)), sec, l + 1, b + 1)
    }
    const p = FLAT.platea
    if (d < -0.5 || d > p.dEnd + 0.5) return null
    const k = Math.max(0, Math.min(p.rows - 1, Math.floor((d - p.d0) / p.tread)))
    const sec = findSectionFor('recta-platea', { x: sx })
    const seatNumber = Math.max(1, Math.round(((sx + HX) / (2 * HX)) * 68))
    return enrich('recta-platea', plateaSeat(k, sx), sec, k + 1, seatNumber)
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
  const zoneId = `${sideOf(proj.seg, proj.f)}-${pick.t.id}`
  const sec = findSectionFor(zoneId, { seg: proj.seg, f: proj.f })
  const seatNumber = Math.max(1, Math.round(proj.f * 36) + 1)
  return enrich(zoneId, tierSeat(pick.t, proj.seg, proj.f, pick.k), sec, pick.k + 1, seatNumber)
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
