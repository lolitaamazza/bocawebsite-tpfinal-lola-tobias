import { describe, expect, it } from 'vitest'
import {
  BOWL,
  FLAT,
  HX,
  HZ,
  PITCH,
  ROOF,
  SECTIONS,
  TIERS,
  TUNNEL,
  UBICACIONES,
  ZONES,
  bandOutline,
  curveLength,
  footprint,
  insidePolygon,
  pathSamples,
  seatLayout,
  sectionById,
  soffitAt,
  spotSeat,
  zoneAt,
} from './layout'
import {
  aerialPose,
  flight,
  fovFor,
  introPose,
  seatLookPose,
  seatPose,
  sectionOverviewPose,
  topDownPose,
  tunnelPose,
  tunnelToAerialPose,
  ubicacionPose,
} from './views'

const SEATS = seatLayout()
const ASPECTS = [0.46, 0.75, 1, 1.5, 2.2]
const area = (poly) => {
  let a = 0
  for (let i = 0; i < poly.length - 1; i++) a += poly[i][0] * poly[i + 1][1] - poly[i + 1][0] * poly[i][1]
  return a / 2
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const norm = (a) => {
  const l = Math.hypot(...a)
  return a.map((v) => v / l)
}

describe('contorno de la U', () => {
  const poly = footprint(1.5)

  it('el contorno está cerrado', () => {
    expect(poly.at(-1)).toEqual(poly[0])
  })

  it('no tiene saltos sobre la U (solo el lado recto es un tramo largo)', () => {
    const gaps = poly.slice(1).map((p, i) => Math.hypot(p[0] - poly[i][0], p[1] - poly[i][1]))
    const long = gaps.filter((g) => g > 1.6)
    expect(long).toHaveLength(1)
    expect(long[0]).toBeCloseTo(2 * HX, 6)
  })

  it('encierra la cancha y mide lo que un rectángulo con dos esquinas redondeadas', () => {
    const R = BOWL.corner
    const expected = 4 * HX * HZ - 2 * (1 - Math.PI / 4) * R * R
    expect(Math.abs(Math.abs(area(poly)) - expected) / expected).toBeLessThan(0.005)
    const [L, W] = [PITCH.length / 2, PITCH.width / 2]
    for (const c of [
      [L, W],
      [-L, W],
      [L, -W],
      [-L, -W],
    ])
      expect(insidePolygon(c, poly)).toBe(true)
  })

  it('las normales son unitarias y continuas en las uniones', () => {
    const s = pathSamples(1)
    s.forEach((p) => expect(Math.hypot(p.nx, p.nz)).toBeCloseTo(1, 9))
    for (let i = 1; i < s.length; i++) expect(s[i].nx * s[i - 1].nx + s[i].nz * s[i - 1].nz).toBeGreaterThan(0.99)
  })

  it('cada banda de bandeja también cierra y se agranda hacia afuera', () => {
    for (const t of TIERS) {
      const band = bandOutline(t.d0, t.dEnd)
      expect(band.at(-1)).toEqual(band[0])
      expect(curveLength(t.dEnd)).toBeGreaterThan(curveLength(t.d0))
    }
  })
})

describe('bandejas', () => {
  it('suben: cada fila más alta que la anterior y cada bandeja arriba y atrás de la otra', () => {
    TIERS.forEach((t, i) => {
      expect(t.riser).toBeGreaterThan(0)
      expect(t.top).toBeGreaterThan(t.y0)
      if (i === 0) return
      const prev = TIERS[i - 1]
      expect(t.d0).toBeGreaterThan(prev.d0)
      expect(t.dEnd).toBeGreaterThan(prev.dEnd)
      // vuela sobre la anterior: en todo lo que se superponen, abajo queda altura para pararse
      for (let d = t.d0; d <= prev.dEnd; d += 0.25) {
        const k = Math.min(prev.rows - 1, Math.floor((d - prev.d0) / prev.tread))
        expect(soffitAt(t, d) - (prev.y0 + k * prev.riser)).toBeGreaterThan(2.5)
      }
    })
    expect(ROOF).toBeGreaterThan(TIERS.at(-1).top)
  })

  it('son empinadas como en la Bombonera (más de 29°) y cada vez más', () => {
    const slopes = TIERS.map((t) => (Math.atan2(t.riser, t.tread) * 180) / Math.PI)
    slopes.forEach((s) => expect(s).toBeGreaterThan(29))
    slopes.slice(1).forEach((s, i) => expect(s).toBeGreaterThan(slopes[i]))
  })

  it('el lado recto: palcos apilados casi a plomo y sobre la platea', () => {
    const P = FLAT.palcos
    expect(P.y0).toBeGreaterThan(FLAT.platea.top)
    const lean = (Math.atan2(P.setback, P.height) * 180) / Math.PI
    expect(lean).toBeLessThan(8)
    expect(P.perLevel).toBeGreaterThan(20)
  })
})

describe('butacas y sectores', () => {
  it('los ids de zonas y de ubicaciones son únicos', () => {
    const z = ZONES.map((x) => x.id)
    const u = UBICACIONES.map((x) => x.id)
    expect(new Set(z).size).toBe(z.length)
    expect(new Set(u).size).toBe(u.length)
  })

  it('el armado es determinístico', () => {
    const again = seatLayout()
    expect(again.count).toBe(SEATS.count)
    expect(again.counts).toEqual(SEATS.counts)
    expect(Array.from(again.positions.slice(0, 300))).toEqual(Array.from(SEATS.positions.slice(0, 300)))
  })

  it('cada zona tiene butacas y la suma da el total', () => {
    const sum = Object.values(SEATS.counts).reduce((a, b) => a + b, 0)
    expect(sum).toBe(SEATS.count)
    ZONES.forEach((z) => expect(SEATS.counts[z.id]).toBeGreaterThan(0))
    expect(SEATS.positions.length).toBe(3 * SEATS.count)
    expect(SEATS.yaw.length).toBe(SEATS.count)
  })

  it('las dos cabeceras son espejo: misma cantidad de butacas', () => {
    for (const t of TIERS) expect(SEATS.counts[`a-${t.id}`]).toBe(SEATS.counts[`b-${t.id}`])
  })

  it('ninguna butaca cae en la cancha y todas miran hacia adentro', () => {
    const poly = footprint(1)
    for (let i = 0; i < SEATS.count; i += 7) {
      const x = SEATS.positions[3 * i]
      const z = SEATS.positions[3 * i + 2]
      expect(insidePolygon([x, z], poly)).toBe(false)
      // mirar hacia adelante (+z local girado yaw) acerca al centro
      const fx = Math.sin(SEATS.yaw[i])
      const fz = Math.cos(SEATS.yaw[i])
      expect(Math.hypot(x + fx, z + fz)).toBeLessThan(Math.hypot(x, z))
    }
  })
})

describe('ubicaciones', () => {
  it('cada ubicación cae en una zona existente y zoneAt la reconoce', () => {
    for (const u of UBICACIONES) {
      const s = spotSeat(u)
      expect(ZONES.some((z) => z.id === s.zone)).toBe(true)
      expect(zoneAt(s.x, s.y + 0.05, s.z)?.zone).toBe(s.zone)
    }
  })

  it('las ubicaciones tienen las zonas esperadas', () => {
    const zone = (id) => spotSeat(UBICACIONES.find((u) => u.id === id)).zone
    expect(zone('platea-baja')).toBe('lateral-baja')
    expect(zone('platea-alta')).toBe('lateral-alta')
    expect(zone('popular')).toBe('a-media')
    expect(zone('palcos')).toBe('recta-palcos')
    expect(zone('cabecera')).toBe('b-alta')
  })

  it('desde el palco no hay un parante delante de los ojos (la butaca va al medio del palco)', () => {
    const s = spotSeat(UBICACIONES.find((u) => u.id === 'palcos'))
    const W = FLAT.palcos.width
    const fromPost = (((s.x + HX) % W) + W) % W
    expect(Math.min(fromPost, W - fromPost)).toBeGreaterThan(W / 2 - 0.01)
    // un clic en cualquier parte del palco también te sienta en el medio
    const hit = zoneAt(s.x + W * 0.45, s.y + 1, s.z + 0.5)
    expect(hit.zone).toBe('recta-palcos')
    expect(hit.seat.x).toBeCloseTo(s.x, 9)
  })

  it('un clic en la cancha no es una ubicación; uno en la tribuna sí', () => {
    expect(zoneAt(0, 0, 0)).toBeNull()
    expect(zoneAt(10, 0, 20)).toBeNull()
    const hit = zoneAt(0, 5, HZ + 8)
    expect(hit?.zone).toBe('lateral-baja')
    expect(hit.seat.z).toBeGreaterThan(HZ)
  })
})

describe('cámaras', () => {
  it('desde cada butaca se mira hacia abajo, a un punto de la cancha', () => {
    for (const u of UBICACIONES) {
      const { pos, target } = ubicacionPose(u)
      expect(pos[1]).toBeGreaterThan(target[1])
      expect(Math.abs(target[0])).toBeLessThan(PITCH.length / 2)
      expect(Math.abs(target[2])).toBeLessThan(PITCH.width / 2)
      expect(Math.hypot(...sub(target, pos))).toBeGreaterThan(15)
    }
  })

  it('la cancha entra en el cuadro desde cada butaca (el centro adelante de la cámara)', () => {
    for (const u of UBICACIONES) {
      const { pos, target } = seatPose(spotSeat(u))
      const f = norm(sub(target, pos))
      const c = norm(sub([0, 0, 0], pos))
      expect(f[0] * c[0] + f[1] * c[1] + f[2] * c[2]).toBeGreaterThan(Math.cos((fovFor(1.5) * Math.PI) / 360))
    }
  })

  it('la vuelta de entrada termina exactamente en la vista aérea', () => {
    for (const a of ASPECTS) {
      const end = introPose(1, a)
      const aerial = aerialPose(a)
      end.pos.forEach((v, i) => expect(v).toBeCloseTo(aerial.pos[i], 9))
      end.target.forEach((v, i) => expect(v).toBeCloseTo(aerial.target[i], 9))
      expect(introPose(0, a).pos[1]).toBeGreaterThan(aerial.pos[1])
    }
  })

  it('la vista aérea queda por encima y fuera del estadio, más lejos en vertical', () => {
    for (const a of ASPECTS) {
      const { pos } = aerialPose(a)
      expect(pos[1]).toBeGreaterThan(ROOF * 2)
      expect(Math.hypot(pos[0], pos[2])).toBeGreaterThan(HX)
    }
    expect(Math.hypot(...aerialPose(0.46).pos)).toBeGreaterThan(Math.hypot(...aerialPose(2).pos))
  })

  it('el vuelo arranca y termina en las poses dadas y sube a mitad de camino', () => {
    const from = aerialPose(1.5)
    const to = ubicacionPose(UBICACIONES[0])
    expect(flight(from, to, 0)).toEqual({ pos: from.pos, target: from.target })
    const end = flight(from, to, 1)
    end.pos.forEach((v, i) => expect(v).toBeCloseTo(to.pos[i], 9))
    const mid = flight(from, to, 0.5)
    expect(mid.pos[1]).toBeGreaterThan((from.pos[1] + to.pos[1]) / 2)
  })

  it('el túnel mira desde bajo el lado recto hacia el campo y su vuelo termina en el mapa cenital', () => {
    const t0 = tunnelPose(0)
    expect(t0.pos[2]).toBeLessThan(TUNNEL.z0)
    expect(t0.target[2]).toBeGreaterThan(0)
    for (const a of ASPECTS) {
      const end = tunnelToAerialPose(1, a, true)
      const top = topDownPose(a, 0.08)
      end.pos.forEach((v, i) => expect(v).toBeCloseTo(top.pos[i], 9))
      end.target.forEach((v, i) => expect(v).toBeCloseTo(top.target[i], 9))
    }
  })

  it('la vista cercana de sector mira de frente hacia las filas y seatLookPose permite mirar al tablero LED', () => {
    for (const u of UBICACIONES) {
      const s = spotSeat(u)
      const secPose = sectionOverviewPose(s)
      expect(Math.hypot(...sub(secPose.target, secPose.pos))).toBeGreaterThan(10)
      const jumbo = seatLookPose(s, 'jumbotron')
      expect(jumbo.target[1]).toBeGreaterThan(jumbo.pos[1])
    }
  })
})

describe('ticketing 3D y sectores', () => {
  it('tiene 33 sectores interactivos con precio, puerta, contorno 3D y butacas destacadas', () => {
    expect(SECTIONS).toHaveLength(33)
    for (const sec of SECTIONS) {
      expect(sectionById(sec.id)).toBe(sec)
      expect(sec.price).toBeGreaterThan(0)
      expect(sec.priceLabel).toMatch(/^\$/)
      expect(sec.available).toBeGreaterThan(0)
      expect(sec.outline3D.length).toBeGreaterThan(6)
      expect(sec.featuredSeats.length).toBeGreaterThanOrEqual(9)
    }
  })
})
