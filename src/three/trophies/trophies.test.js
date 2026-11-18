import { describe, expect, it } from 'vitest'
import { logros } from '@/data/logros'
import { goldGeometry, plinthGeometry } from './geometry'
import { CABINET, cabinetLayout, shelfLayout, trophyRows } from './layout'
import {
  TROPHIES,
  bodyProfile,
  handlePlacement,
  outerRadius,
  plinthHeight,
  plinthProfile,
  sampleSilhouette,
  sharpen,
  trophyMetrics,
} from './profiles'
import { FOV, activeShelf, overview, prepareWalk, sampleWalk, uniformStops, walkKeys, walkStops } from './rig'
import { monotone } from './spline'

const TYPES = Object.keys(TROPHIES)
const ROWS = trophyRows(logros)
const CAB = cabinetLayout(ROWS)
const ASPECTS = [0.5, 0.66, 0.93, 1.3, 1.78, 2.4]

/** Dónde cae un punto en pantalla (NDC) con una cámara que mira de pos a target */
function ndc(pos, target, point, aspect, fov = FOV) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const norm = (a) => {
    const l = Math.hypot(...a)
    return a.map((v) => v / l)
  }
  const f = norm(sub(target, pos))
  const r = norm(cross(f, [0, 1, 0]))
  const u = cross(r, f)
  const v = sub(point, pos)
  const depth = dot(v, f)
  const t = Math.tan((fov * Math.PI) / 360)
  return { x: dot(v, r) / (depth * t * aspect), y: dot(v, u) / (depth * t), depth }
}
const inView = (p, m = 1) => p.depth > 0 && Math.abs(p.x) <= m && Math.abs(p.y) <= m

describe('cúbica monótona', () => {
  const xs = [0, 0.1, 0.35, 0.4, 1]
  const ys = [0, 2, 2.5, 7, 7]
  const f = monotone(xs, ys)

  it('pasa por los nudos', () => {
    xs.forEach((x, i) => expect(f(x)).toBeCloseTo(ys[i], 10))
  })

  it('no se pasa de largo entre nudos (sin rebotes)', () => {
    for (let k = 0; k < xs.length - 1; k++)
      for (let i = 0; i <= 50; i++) {
        const y = f(xs[k] + ((xs[k + 1] - xs[k]) * i) / 50)
        expect(y).toBeGreaterThanOrEqual(Math.min(ys[k], ys[k + 1]) - 1e-9)
        expect(y).toBeLessThanOrEqual(Math.max(ys[k], ys[k + 1]) + 1e-9)
      }
  })
})

describe('siluetas de los trofeos', () => {
  it('hay un tipo por cada logro que se apila', () => {
    for (const l of logros.filter((x) => !x.total)) expect(TROPHIES[l.id], l.id).toBeDefined()
  })

  for (const type of TYPES) {
    const trophy = TROPHIES[type]
    const pts = bodyProfile(trophy)

    describe(type, () => {
      it('los nudos suben (y creciente) y el radio es positivo', () => {
        for (const part of [trophy.body.outer, trophy.body.inner ?? []])
          part.forEach(([y, r], i) => {
            expect(r).toBeGreaterThanOrEqual(0)
            if (i) expect(y).toBeGreaterThan(part[i - 1][0])
          })
      })

      it('el perfil cierra contra el eje abajo y arriba (sólido sin agujeros)', () => {
        expect(pts[0][0]).toBe(0)
        expect(pts[pts.length - 1][0]).toBe(0)
        for (const [x] of pts.slice(1, -1)) expect(x).toBeGreaterThan(0)
      })

      it('la pared de afuera sube y la de adentro baja (normales hacia afuera)', () => {
        const top = pts.reduce((m, p) => Math.max(m, p[1]), -Infinity)
        const rim = pts.findIndex((p) => p[1] === top)
        for (let i = 1; i <= rim; i++) expect(pts[i][1]).toBeGreaterThanOrEqual(pts[i - 1][1])
        for (let i = rim + 1; i < pts.length; i++) expect(pts[i][1]).toBeLessThanOrEqual(pts[i - 1][1])
      })

      it('copas abiertas: el labio está a la altura del borde y la pared tiene espesor', () => {
        if (!trophy.body.inner) return
        const outer = trophy.body.outer
        const inner = trophy.body.inner
        expect(inner[inner.length - 1][0]).toBe(outer[outer.length - 1][0])
        expect(inner[0][1]).toBe(0)
        const r = outerRadius(trophy)
        for (const [x, y] of sampleSilhouette(inner, 120)) expect(r(y) - x, `${type} y=${y.toFixed(3)}`).toBeGreaterThan(0.004)
      })

      it('la base escalonada sube y cierra contra el eje', () => {
        const p = plinthProfile(trophy.plinth.steps)
        expect(p[0]).toEqual([0, 0])
        expect(p[p.length - 1]).toEqual([0, plinthHeight(trophy)])
        p.forEach(([x, y], i) => {
          expect(x).toBeGreaterThanOrEqual(0)
          if (i) expect(y).toBeGreaterThanOrEqual(p[i - 1][1])
        })
      })

      it('entra en su lugar del estante sin tocar al vecino', () => {
        const { footprint } = trophyMetrics(trophy)
        expect(trophy.layout.spacing).toBeGreaterThan(2 * footprint + 0.02)
        if (trophy.layout.maxPerRow < 99) expect(trophy.layout.rowGap).toBeGreaterThan(2 * footprint)
      })

      if (trophy.handles)
        it('las asas apoyan en la pared y se abren hacia afuera', () => {
          const h = handlePlacement(trophy)
          const r = outerRadius(trophy)
          for (const [x, y] of h.ends) expect(Math.abs(x - r(y))).toBeLessThan(1e-3)
          expect(h.apex[0]).toBeGreaterThan(r(h.apex[1]) + h.tube)
          // las puntas del arco del toro caen justo sobre esos dos puntos
          for (const s of [1, -1]) {
            const a = h.angle + (s * h.arc) / 2
            const end = [h.center[0] + h.R * Math.cos(a), h.center[1] + h.R * Math.sin(a)]
            const want = s > 0 ? h.ends[0] : h.ends[1]
            expect(end[0]).toBeCloseTo(want[0], 4)
            expect(end[1]).toBeCloseTo(want[1], 4)
          }
        })

      it('geometría: sin NaN, normales unitarias y dentro de sus medidas', () => {
        const m = trophyMetrics(trophy)
        for (const g of [goldGeometry(trophy), plinthGeometry(trophy)]) {
          const pos = g.getAttribute('position').array
          const nor = g.getAttribute('normal').array
          for (const v of pos) expect(Number.isFinite(v)).toBe(true)
          let bad = 0
          for (let i = 0; i < nor.length; i += 3) {
            const l = Math.hypot(nor[i], nor[i + 1], nor[i + 2])
            // los triángulos degenerados del polo pueden quedar en 0; nunca NaN ni largos raros
            if (!(Math.abs(l - 1) < 1e-3 || l === 0)) bad++
          }
          expect(bad).toBe(0)
          g.computeBoundingBox()
          const b = g.boundingBox
          expect(b.min.y).toBeGreaterThanOrEqual(-1e-6)
          expect(b.max.y).toBeLessThanOrEqual(m.height + 1e-3)
          expect(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z)).toBeLessThanOrEqual(m.footprint + 1e-3)
          g.dispose()
        }
      })

      it('la base tiene laca y filete dorado (dos grupos de material)', () => {
        const g = plinthGeometry(trophy)
        expect(g.groups.map((x) => x.materialIndex)).toEqual([0, 1])
        g.dispose()
      })
    })
  }

  it('cada tipo se distingue por su silueta (alto, ancho, asas, tapa)', () => {
    const sig = TYPES.map((t) => {
      const tr = TROPHIES[t]
      const m = trophyMetrics(tr)
      return [m.height.toFixed(2), m.footprint.toFixed(2), Boolean(tr.handles), Boolean(tr.finial), tr.plinth.shape].join('|')
    })
    expect(new Set(sig).size).toBe(TYPES.length)
    const h = (t) => trophyMetrics(TROPHIES[t]).height
    expect(h('libertadores')).toBeGreaterThan(h('intercontinental'))
    expect(h('sudamericana')).toBeGreaterThan(h('copa-argentina'))
    expect(h('liga')).toBeLessThan(Math.min(...TYPES.filter((t) => t !== 'liga').map(h)))
  })

  it('sharpen duplica solo las esquinas, nunca las puntas', () => {
    const step = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]
    expect(sharpen(step)).toEqual([
      [0, 0],
      [1, 0],
      [1, 0],
      [1, 1],
      [1, 1],
      [0, 1],
    ])
    const arc = Array.from({ length: 40 }, (_, i) => [Math.cos(i / 40), Math.sin(i / 40)])
    expect(sharpen(arc)).toHaveLength(40)
  })
})

describe('shelfLayout', () => {
  const minGap = (ps) => {
    let m = Infinity
    for (let i = 0; i < ps.length; i++)
      for (let j = i + 1; j < ps.length; j++) m = Math.min(m, Math.hypot(ps[i].x - ps[j].x, ps[i].z - ps[j].z))
    return m
  }

  it('cuenta exacta, filas parejas y centradas', () => {
    for (const [count, maxPerRow] of [
      [1, 8],
      [2, 4],
      [3, 4],
      [6, 8],
      [7, 4],
      [36, 12],
      [37, 12],
      [22, 5],
    ]) {
      const ps = shelfLayout(count, { maxPerRow, spacing: 0.3, rowGap: 0.2 })
      expect(ps).toHaveLength(count)
      const rows = Math.ceil(count / maxPerRow)
      const sizes = Array.from({ length: rows }, (_, r) => ps.filter((p) => p.row === r).length)
      expect(sizes.every((s) => s > 0 && s <= maxPerRow)).toBe(true)
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
      // adelante nunca más llena que atrás
      for (let r = 1; r < rows; r++) expect(sizes[r]).toBeGreaterThanOrEqual(sizes[r - 1])
      for (let r = 0; r < rows; r++) {
        const xs = ps.filter((p) => p.row === r).map((p) => p.x)
        expect(xs.reduce((a, b) => a + b, 0) / xs.length).toBeCloseTo(0, 10)
      }
      const zs = [...new Set(ps.map((p) => p.z))]
      expect(zs.reduce((a, b) => a + b, 0) / zs.length).toBeCloseTo(0, 10)
    }
  })

  it('36 copas de liga: 3 gradas de 12, la de atrás más alta y más al fondo', () => {
    const ps = shelfLayout(36, TROPHIES.liga.layout)
    const sizes = [0, 1, 2].map((r) => ps.filter((p) => p.row === r).length)
    expect(sizes).toEqual([12, 12, 12])
    const back = ps.find((p) => p.row === 2)
    const front = ps.find((p) => p.row === 0)
    expect(back.y).toBeGreaterThan(front.y)
    expect(back.z).toBeLessThan(front.z)
  })

  it('no se pisan: la distancia mínima es el paso o la separación de filas', () => {
    for (const [count, opts] of [
      [36, { maxPerRow: 12, spacing: 0.24, rowGap: 0.19 }],
      [6, { maxPerRow: 8, spacing: 0.44, rowGap: 0.36 }],
      [9, { maxPerRow: 4, spacing: 0.5, rowGap: 0.3 }],
    ])
      expect(minGap(shelfLayout(count, opts))).toBeGreaterThanOrEqual(Math.min(opts.spacing, opts.rowGap) - 1e-9)
  })

  it('casos borde', () => {
    expect(shelfLayout(0, { maxPerRow: 4, spacing: 1 })).toEqual([])
    expect(shelfLayout(-3, { maxPerRow: 4, spacing: 1 })).toEqual([])
    expect(shelfLayout(1, { maxPerRow: 4, spacing: 1 })).toEqual([{ x: 0, y: 0, z: 0, row: 0, col: 0 }])
  })
})

describe('logros → estantes', () => {
  it('los totales no se apilan: 22 internacionales es una cifra, no 22 copas más', () => {
    expect(ROWS.map((r) => r.id)).not.toContain('internacionales')
    expect(logros.find((l) => l.id === 'internacionales').total).toBe(true)
  })

  it('un estante por tipo, con tantas copias como títulos y en el orden de los datos', () => {
    const stacked = logros.filter((l) => !l.total)
    expect(ROWS.map((r) => r.id)).toEqual(stacked.map((l) => l.id))
    ROWS.forEach((r) => expect(r.count).toBe(logros.find((l) => l.id === r.id).count))
    expect(Object.fromEntries(ROWS.map((r) => [r.id, r.count]))).toEqual({
      libertadores: 6,
      intercontinental: 3,
      liga: 36,
      sudamericana: 2,
      'copa-argentina': 4,
    })
  })

  it('el mueble tiene una copa por título', () => {
    expect(CAB.shelves.reduce((s, sh) => s + sh.positions.length, 0)).toBe(51)
  })
})

describe('cabinetLayout', () => {
  it('estantes de arriba hacia abajo, sin pisarse', () => {
    CAB.shelves.forEach((sh, i) => {
      if (i) expect(sh.y).toBeLessThan(CAB.shelves[i - 1].y)
      const above = i ? CAB.shelves[i - 1].y - CAB.glass : CAB.ceiling
      expect(sh.y + sh.contentHeight + CABINET.headroom - 1e-9).toBeLessThanOrEqual(above + 1e-9)
    })
    expect(CAB.shelves[CAB.shelves.length - 1].y).toBe(CABINET.base)
    expect(CAB.height).toBeGreaterThan(CAB.ceiling)
  })

  it('todo entra en el ancho y la profundidad del mueble', () => {
    for (const sh of CAB.shelves)
      for (const p of sh.positions) {
        expect(Math.abs(p.x) + sh.metrics.footprint).toBeLessThanOrEqual(CAB.width / 2 - CABINET.margin + 1e-9)
        expect(Math.abs(p.z) + sh.metrics.footprint).toBeLessThanOrEqual(CAB.depth / 2)
      }
  })

  it('proporciones de vitrina (más alta que ancha, menos de un metro de fondo)', () => {
    expect(CAB.height).toBeGreaterThan(CAB.width)
    expect(CAB.depth).toBeLessThan(1)
  })
})

describe('recorrido de la cámara', () => {
  it('stops: parejos por defecto y medidos cuando hay lista al costado', () => {
    expect(uniformStops(5)).toEqual([1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6])
    // ítems de 100vh: el centrado de cada uno cae en (i+1)/(n+1)
    const vh = 800
    const centers = [0, 1, 2, 3, 4].map((i) => (i + 0.5) * vh)
    walkStops(5, { centers, trackHeight: 5 * vh, viewport: vh }).forEach((s, i) => expect(s).toBeCloseTo((i + 1) / 6, 10))
    // medidas que no cierran → parejo
    expect(walkStops(5, { centers: [1, 2], trackHeight: 10, viewport: 10 })).toEqual(uniformStops(5))
    expect(walkStops(3, { centers: [300, 200, 100], trackHeight: 400, viewport: 100 })).toEqual(uniformStops(3))
    expect(walkStops(3, { centers: [10, 20, 30], trackHeight: 0, viewport: 100 })).toEqual(uniformStops(3))
  })

  it('activeShelf: cada estante tiene su ventana y afuera no hay ninguno', () => {
    const s = uniformStops(5)
    s.forEach((p, i) => expect(activeShelf(s, p)).toBe(i))
    expect(activeShelf(s, 0)).toBe(null)
    expect(activeShelf(s, 1)).toBe(null)
    expect(activeShelf(s, (s[0] + s[1]) / 2 + 1e-6)).toBe(1)
    expect(activeShelf([], 0.5)).toBe(null)
    expect(activeShelf([0.5], 0.5)).toBe(0)
  })

  for (const aspect of ASPECTS)
    describe(`aspecto ${aspect}`, () => {
      const keys = walkKeys(CAB, { aspect })
      const walk = prepareWalk(keys)

      it('claves de 0 a 1, estrictamente crecientes, y el muestreo pasa por ellas', () => {
        expect(keys[0].p).toBe(0)
        expect(keys[keys.length - 1].p).toBe(1)
        keys.forEach((k, i) => {
          if (i) expect(k.p).toBeGreaterThan(keys[i - 1].p)
          const s = sampleWalk(walk, k.p)
          k.pos.forEach((v, c) => expect(s.pos[c]).toBeCloseTo(v, 9))
          k.target.forEach((v, c) => expect(s.target[c]).toBeCloseTo(v, 9))
        })
      })

      it('fuera de rango se queda en los extremos', () => {
        expect(sampleWalk(walk, -1).pos).toEqual(sampleWalk(walk, 0).pos)
        expect(sampleWalk(walk, 2).pos).toEqual(sampleWalk(walk, 1).pos)
      })

      it('sin rebotes: entre dos claves la cámara no se pasa de ninguna', () => {
        for (let k = 0; k < keys.length - 1; k++)
          for (let i = 0; i <= 20; i++) {
            const s = sampleWalk(walk, keys[k].p + ((keys[k + 1].p - keys[k].p) * i) / 20)
            for (let c = 0; c < 3; c++) {
              const lo = Math.min(keys[k].pos[c], keys[k + 1].pos[c]) - 1e-9
              const hi = Math.max(keys[k].pos[c], keys[k + 1].pos[c]) + 1e-9
              expect(s.pos[c]).toBeGreaterThanOrEqual(lo)
              expect(s.pos[c]).toBeLessThanOrEqual(hi)
            }
          }
      })

      it('al recorrer cada estante, cada copa pasa por cuadro', () => {
        CAB.shelves.forEach((sh, i) => {
          const [a, b] = keys.filter((k) => k.shelf === i)
          for (const p of sh.positions) {
            const point = [p.x, sh.y + p.y + sh.metrics.height / 2, p.z]
            let seen = false
            for (let j = 0; j <= 40 && !seen; j++) {
              const s = sampleWalk(walk, a.p + ((b.p - a.p) * j) / 40)
              seen = inView(ndc(s.pos, s.target, point, aspect))
            }
            expect(seen, `${sh.id} x=${p.x.toFixed(2)} z=${p.z}`).toBe(true)
          }
        })
      })

      // regresión: con 2 Sudamericanas a ±0.6 la parada del medio mostraba el estante vacío.
      // Celular: al menos una copa con su eje entero en cuadro; escritorio: una copa entera.
      it('en cada parada hay una copa en cuadro (nunca un estante vacío)', () => {
        if (aspect < 0.6) return // más angosto que un celular vertical: solo se exige el paso
        const sides = aspect >= 0.9 ? [-1, 1] : [0]
        CAB.shelves.forEach((sh, i) => {
          const [a, b] = keys.filter((k) => k.shelf === i)
          const s = sampleWalk(walk, (a.p + b.p) / 2)
          const { footprint, height } = sh.metrics
          const shown = (p) =>
            [0, height].every((dy) =>
              sides.every((sx) => inView(ndc(s.pos, s.target, [p.x + sx * footprint, sh.y + p.y + dy, p.z], aspect))),
            )
          expect(sh.positions.some(shown), `${sh.id} aspecto ${aspect}`).toBe(true)
        })
      })

      it('en su parada, el estante entra entero de alto', () => {
        CAB.shelves.forEach((sh, i) => {
          const [a, b] = keys.filter((k) => k.shelf === i)
          const s = sampleWalk(walk, (a.p + b.p) / 2)
          for (const y of [sh.y, sh.y + sh.contentHeight]) expect(inView(ndc(s.pos, s.target, [s.target[0], y, 0], aspect))).toBe(true)
        })
      })

      it('plano general: entra el mueble entero (también al entrar y al salir)', () => {
        const { width: w, height: h, depth: d } = CAB
        const corners = []
        for (const x of [-w / 2, w / 2]) for (const y of [0, h]) for (const z of [-d / 2, d / 2]) corners.push([x, y, z])
        for (const o of [overview(CAB, { aspect }), keys[0], keys[keys.length - 1]])
          for (const c of corners) expect(inView(ndc(o.pos, o.target, c, aspect))).toBe(true)
      })
    })

  it('con paradas medidas, la cámara llega a cada estante cuando su texto está centrado', () => {
    const stops = [0.2, 0.33, 0.52, 0.7, 0.82]
    const keys = walkKeys(CAB, { aspect: 1, stops })
    CAB.shelves.forEach((sh, i) => {
      const [a, b] = keys.filter((k) => k.shelf === i)
      expect(a.p).toBeLessThan(stops[i])
      expect(b.p).toBeGreaterThan(stops[i])
      expect((a.p + b.p) / 2).toBeCloseTo(stops[i], 10)
    })
  })
})
