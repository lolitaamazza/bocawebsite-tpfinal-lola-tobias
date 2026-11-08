import { describe, expect, it } from 'vitest'
import { stagePose, type StageInput } from './stage'

const base: StageInput = {
  rect: { x0: 0, y0: 0.12, x1: 0.6, y1: 0.95, tuck: 0 },
  tanHalf: Math.tan((32 * Math.PI) / 360),
  aspect: 16 / 9,
  cameraY: 1.3,
  cameraZ: 3.5,
  distance: 2.1,
  shirtWidth: 0.65,
  shirtDrop: 0.84,
  railY: 1.8,
}

describe('stagePose', () => {
  it('la remera queda centrada en el hueco libre (a la izquierda de la ficha)', () => {
    const p = stagePose(base)
    expect(p.x).toBeLessThan(0)
    expect(p.z).toBeCloseTo(3.5 - 2.1)
  })

  it('la escala respeta mínimo y máximo', () => {
    expect(stagePose({ ...base, rect: { ...base.rect, x1: 0.01, y1: 0.13 } }).scale).toBe(0.2)
    expect(stagePose({ ...base, shirtWidth: 0.01, shirtDrop: 0.01 }).scale).toBe(1.25)
  })

  it('entra entera en apaisado: el gancho y el bajo quedan dentro del hueco', () => {
    const p = stagePose(base)
    const viewH = 2 * base.distance * base.tanHalf
    const top = base.cameraY + (0.5 - base.rect.y0) * viewH
    const bottom = base.cameraY + (0.5 - base.rect.y1) * viewH
    const hook = base.railY + p.y
    expect(hook).toBeLessThanOrEqual(top + 1e-9)
    expect(hook - base.shirtDrop * p.scale).toBeGreaterThanOrEqual(bottom - 1e-9)
  })

  it('en vertical angosto con tuck el bajo puede esconderse detrás de la ficha', () => {
    const p = stagePose({ ...base, aspect: 375 / 812, rect: { x0: 0, y0: 0.1, x1: 1, y1: 0.55, tuck: 0.2 } })
    expect(Number.isFinite(p.y)).toBe(true)
    expect(p.x).toBeCloseTo(0)
  })
})
