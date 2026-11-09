import { describe, expect, it } from 'vitest'
import { recolorSvg, svgSize } from './brand'
import { kit } from './kitSpec'
import { layoutName, layoutNumber } from './lettering'
import { TEMPLATE_H, TEMPLATE_W, pxPerMetre, rowAt, worldToTemplate } from './uvMap'
describe('uvMap', () => {
  it('el pecho cae en el medio de cada mitad', () => {
    const f = worldToTemplate('front', 0, -0.3)
    const b = worldToTemplate('back', 0, -0.3)
    expect(f.x).toBeGreaterThan(TEMPLATE_W * 0.4)
    expect(f.x).toBeLessThan(TEMPLATE_W * 0.6)
    expect(b.x).toBeGreaterThan(TEMPLATE_W * 0.4)
    expect(b.x).toBeLessThan(TEMPLATE_W * 0.6)
  })
  it('la franja queda a la misma altura real adelante y atrás (±1 cm)', () => {
    const y = kit.band.centre
    const front = rowAt('front', y) / pxPerMetre('front')
    const back = rowAt('back', y) / pxPerMetre('back')
    // Las dos filas, devueltas a metros, describen el mismo punto del modelo
    const toY = (side, row) => {
      const a = worldToTemplate(side, 0, 0).y
      return -(row - a) / pxPerMetre(side)
    }
    expect(toY('front', rowAt('front', y))).toBeCloseTo(y, 2)
    expect(toY('back', rowAt('back', y))).toBeCloseTo(y, 2)
    expect(Number.isFinite(front + back)).toBe(true)
  })
  it('franja y número entran en la plantilla', () => {
    const half = kit.band.half + kit.band.royal
    for (const side of ['front', 'back']) {
      expect(rowAt(side, kit.band.centre + half)).toBeGreaterThan(0)
      expect(rowAt(side, kit.band.centre - half)).toBeLessThan(TEMPLATE_H)
    }
    const t = kit.lettering
    expect(t.numberCentre - t.numberCap / 2).toBeGreaterThan(t.nameBaseline)
  })
  it('el sponsor queda debajo de la franja y del dorsal', () => {
    const t = kit.lettering
    const bandRow = rowAt('back', kit.band.centre)
    const bandBottom = bandRow + (kit.band.half + kit.band.royal) * pxPerMetre('back')
    const sponsorTop = kit.backMarks.directv.y - kit.backMarks.directv.w * 31 / 192 / 2
    expect(sponsorTop).toBeGreaterThan(bandBottom)
    expect(sponsorTop).toBeGreaterThan(t.numberCentre + t.numberCap / 2)
  })
})
describe('lettering', () => {
  it('nombre centrado con interletrado', () => {
    const { glyphs, squeeze, width } = layoutName([10, 10, 10], 100, 2, 1000)
    expect(squeeze).toBe(1)
    expect(width).toBe(34)
    expect(glyphs.map((g) => g.x)).toEqual([88, 100, 112])
  })
  it('un apellido largo se comprime en horizontal en vez de salirse', () => {
    const { squeeze, width, glyphs } = layoutName(Array(20).fill(30), 400, 3, 440)
    expect(squeeze).toBeLessThan(1)
    expect(width).toBeCloseTo(440)
    expect(glyphs[0].x - glyphs[0].width / 2).toBeCloseTo(180)
  })
  it('número de dos cifras centrado', () => {
    expect(layoutNumber([50, 50], 100, 10)).toEqual([70, 130])
    expect(layoutNumber([60], 100, 10)).toEqual([100])
  })
})
describe('brand', () => {
  it('recolorea rellenos blancos y saca máscaras', () => {
    const svg = '<svg viewBox="0 0 10 5"><mask id="m"><path fill="white"/></mask><g mask="url(#m)"><path fill="white"/></g></svg>'
    const out = recolorSvg(svg, '#123456')
    expect(out).not.toContain('mask')
    expect(out).toContain('fill="#123456"')
    expect(out).not.toContain('white')
  })
  it('lee el tamaño del viewBox', () => {
    expect(svgSize('<svg width="1" height="1" viewBox="0 0 103 24">')).toEqual({ w: 103, h: 24 })
  })
})
