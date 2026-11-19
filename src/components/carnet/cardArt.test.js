import { describe, expect, it } from 'vitest'
import { BACK, CARD, EXPORT_SCALE, FRANJA, FRONT, bandPath, coverRect, decorativeMatrix, fitFontSize, franjaX, guillochePaths, matrixPaths, roundRectPath } from './cardArt'

const numbers = (d) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)

describe('medidas del carnet', () => {
  it('respeta la proporción de una tarjeta ID-1 (85,6 × 54 mm)', () => {
    expect(CARD.w / CARD.h).toBeCloseTo(85.6 / 54, 10)
    expect(CARD.w / CARD.mm.w).toBe(10)
    expect(CARD.h / CARD.mm.h).toBe(10)
  })

  it('el PNG sale al doble: 1712 × 1080', () => {
    expect([CARD.w * EXPORT_SCALE, CARD.h * EXPORT_SCALE]).toEqual([1712, 1080])
  })

  it('todas las cajas y textos de las dos caras caen dentro del carnet', () => {
    for (const [face, layout] of [['frente', FRONT], ['dorso', BACK]]) {
      for (const [key, raw] of Object.entries(layout)) {
        // el patrón es una caja cuadrada: `size` es el lado, no un cuerpo de letra
        const b = raw.pad !== undefined ? { x: raw.x, y: raw.y, w: raw.size, h: raw.size } : raw
        const top = b.h !== undefined ? b.y : b.y - (b.size ?? b.max ?? 0)
        const bottom = b.h !== undefined ? b.y + b.h : b.y
        expect(b.x, `${face}.${key}`).toBeGreaterThanOrEqual(0)
        expect(top, `${face}.${key}`).toBeGreaterThanOrEqual(0)
        expect(bottom, `${face}.${key}`).toBeLessThanOrEqual(CARD.h)
        expect(b.x + (b.w ?? 0), `${face}.${key}`).toBeLessThanOrEqual(CARD.w)
      }
    }
  })

  it('el patrón del dorso no pisa las estadísticas', () => {
    for (const key of ['ubicacion', 'idolo', 'firma']) {
      expect(BACK[key].x + BACK[key].w, key).toBeLessThan(BACK.matrix.x)
    }
  })
})

describe('franja diagonal', () => {
  it('sube hacia la derecha', () => {
    expect(franjaX(0)).toBeGreaterThan(franjaX(CARD.h))
    expect(franjaX(CARD.h)).toBe(FRANJA.bottom)
  })

  it('no pasa por debajo de ningún texto del frente (todos terminan antes del borde de la franja)', () => {
    const texts = ['club', 'clubName', 'tag', 'name', 'apodo', 'socioLabel', 'socio', 'desdeLabel', 'desde', 'legal']
    for (const key of texts) {
      const b = FRONT[key]
      const size = b.max ?? b.size
      const right = b.x + (b.w ?? 0)
      // el borde izquierdo de la franja más cercano es el de abajo de la línea de texto
      const filete = Math.min(franjaX(b.y, -22), franjaX(b.y - size, -22))
      if (b.w !== undefined) expect(right, key).toBeLessThan(filete)
    }
  })

  it('el path es un paralelogramo que cruza el carnet de arriba abajo', () => {
    const [x1, y1, x2, y2, x3, y3, x4, y4] = numbers(bandPath(0, FRANJA.width))
    expect(y1).toBeGreaterThan(CARD.h)
    expect(y2).toBeGreaterThan(CARD.h)
    expect(y3).toBeLessThan(0)
    expect(y4).toBeLessThan(0)
    expect(x2 - x1).toBeCloseTo(FRANJA.width, 0)
    expect(x3 - x4).toBeCloseTo(FRANJA.width, 0)
  })
})

describe('guilloche', () => {
  it('es determinístico y sin NaN', () => {
    const a = guillochePaths()
    expect(guillochePaths()).toEqual(a)
    for (const d of Object.values(a)) {
      expect(d).not.toMatch(/NaN|Infinity/)
      expect(d.startsWith('M')).toBe(true)
    }
  })

  it('con menos calidad usa menos puntos', () => {
    const full = guillochePaths({ quality: 1 }).rings.length
    const light = guillochePaths({ quality: 0.4 }).rings.length
    expect(light).toBeLessThan(full * 0.6)
  })

  it('las ondas cruzan todo el ancho', () => {
    const xs = numbers(guillochePaths().waves).filter((_, i) => i % 2 === 0)
    expect(Math.min(...xs)).toBeLessThanOrEqual(0)
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(CARD.w)
  })
})

describe('rectángulo redondeado', () => {
  it('limita el radio a la mitad del lado más corto', () => {
    expect(roundRectPath(0, 0, 20, 10, 50)).toContain('A5 5')
    expect(roundRectPath(0, 0, 100, 60, 8)).toContain('A8 8')
  })
})

describe('patrón decorativo tipo QR', () => {
  const n = 21

  it('es determinístico por semilla y cambia con la semilla', () => {
    expect(decorativeMatrix('a|JUAN')).toEqual(decorativeMatrix('a|JUAN'))
    expect(decorativeMatrix('a|JUAN')).not.toEqual(decorativeMatrix('a|JUANA'))
  })

  it('es n × n de ceros y unos', () => {
    const m = decorativeMatrix('x', n)
    expect(m).toHaveLength(n)
    for (const row of m) {
      expect(row).toHaveLength(n)
      for (const v of row) expect([0, 1]).toContain(v)
    }
  })

  it('tiene las tres esquinas con su separador, y la cuarta no', () => {
    const m = decorativeMatrix('x', n)
    const corner = (r0, c0) => m.slice(r0, r0 + 7).map((row) => row.slice(c0, c0 + 7).join('')).join('/')
    const finder = '1111111/1000001/1011101/1011101/1011101/1000001/1111111'
    expect(corner(0, 0)).toBe(finder)
    expect(corner(0, n - 7)).toBe(finder)
    expect(corner(n - 7, 0)).toBe(finder)
    expect(corner(n - 7, n - 7)).not.toBe(finder)
    for (let i = 0; i < 8; i++) {
      expect(m[7][i]).toBe(0)
      expect(m[i][7]).toBe(0)
      expect(m[i][n - 8]).toBe(0)
      expect(m[n - 8][i]).toBe(0)
    }
  })

  it('el resto se ve al azar (ni todo lleno ni todo vacío)', () => {
    const flat = decorativeMatrix('PREVIEW|', n).flat()
    const share = flat.reduce((a, b) => a + b, 0) / flat.length
    expect(share).toBeGreaterThan(0.3)
    expect(share).toBeLessThan(0.7)
  })

  it('los paths quedan dentro de su caja y los centros van aparte', () => {
    const box = BACK.matrix
    const { dark, accent } = matrixPaths(decorativeMatrix('x', box.n), box)
    expect(accent.match(/M/g)).toHaveLength(3)
    // M x y h w v h h -w Z: los absolutos son los dos primeros números de cada rect
    const rects = dark.split('Z').filter(Boolean).map(numbers)
    for (const [x, y, w, h] of rects) {
      expect(x).toBeGreaterThanOrEqual(box.x + box.pad - 0.1)
      expect(y).toBeGreaterThanOrEqual(box.y + box.pad - 0.1)
      expect(x + w).toBeLessThanOrEqual(box.x + box.size - box.pad + 0.2)
      expect(y + h).toBeLessThanOrEqual(box.y + box.size - box.pad + 0.2)
    }
  })
})

describe('fitFontSize', () => {
  const box = { min: 26, max: 64 }

  it('si entra, usa el máximo', () => {
    expect(fitFontSize(200, 100, 548, box)).toBe(64)
  })

  it('si no entra, achica en proporción', () => {
    expect(fitFontSize(1096, 100, 548, box)).toBe(50)
  })

  it('nunca baja del mínimo ni sube del máximo', () => {
    expect(fitFontSize(100000, 100, 548, box)).toBe(26)
    expect(fitFontSize(1, 100, 548, box)).toBe(64)
  })

  it('sin medida válida usa el máximo', () => {
    for (const w of [0, -5, NaN, undefined]) expect(fitFontSize(w, 100, 548, box)).toBe(64)
  })

  it('a texto más ancho, cuerpo igual o menor', () => {
    let prev = Infinity
    for (let w = 100; w < 5000; w += 137) {
      const s = fitFontSize(w, 100, 548, box)
      expect(s).toBeLessThanOrEqual(prev)
      prev = s
    }
  })
})

describe('coverRect', () => {
  const ratio = (r) => r.sw / r.sh

  it('foto apaisada: recorta los costados, centrada', () => {
    const r = coverRect(4000, 3000, 192, 256)
    expect(ratio(r)).toBeCloseTo(192 / 256, 6)
    expect(r.sy).toBe(0)
    expect(r.sx).toBeCloseTo((4000 - r.sw) / 2, 6)
  })

  it('foto vertical: recorta arriba y abajo, sin cortar la cara (más arriba que el centro)', () => {
    const r = coverRect(1000, 3000, 192, 256)
    expect(ratio(r)).toBeCloseTo(192 / 256, 6)
    expect(r.sx).toBe(0)
    expect(r.sy).toBeGreaterThan(0)
    expect(r.sy).toBeLessThan((3000 - r.sh) / 2)
  })

  it('el recorte siempre cae dentro de la imagen', () => {
    for (const [w, h] of [
      [1, 1],
      [300, 400],
      [1920, 1080],
      [1080, 1920],
      [5000, 50],
    ]) {
      const r = coverRect(w, h, 192, 256)
      expect(r.sx).toBeGreaterThanOrEqual(0)
      expect(r.sy).toBeGreaterThanOrEqual(0)
      expect(r.sx + r.sw).toBeLessThanOrEqual(w + 1e-9)
      expect(r.sy + r.sh).toBeLessThanOrEqual(h + 1e-9)
    }
  })

  it('sin medidas devuelve null (imagen rota o sin cargar)', () => {
    expect(coverRect(0, 100, 192, 256)).toBeNull()
    expect(coverRect(100, NaN, 192, 256)).toBeNull()
  })
})
