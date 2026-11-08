import { describe, expect, it } from 'vitest'
import { templateToWorld, worldToTemplate } from '../kit/uvMap'
import { buildFace, buildShirtArrays, inflate, pointInPolygon } from './shirtGeometry'

describe('uvMap inversa', () => {
  it('plantilla → mundo → plantilla vuelve al mismo punto en las dos caras', () => {
    for (const side of ['front', 'back']) {
      for (const [X, Y] of [
        [400, 100],
        [120, 300],
        [650, 900],
      ]) {
        const w = templateToWorld(side, X, Y)
        const t = worldToTemplate(side, w.x, w.y)
        expect(t.x).toBeCloseTo(X, 6)
        expect(t.y).toBeCloseTo(Y, 6)
      }
    }
  })
})

describe('remera de respaldo (generada por código)', () => {
  const a = buildShirtArrays()

  it('tiene medidas de remera talle M colgada', () => {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (let i = 0; i < a.position.length; i += 3) {
      minX = Math.min(minX, a.position[i])
      maxX = Math.max(maxX, a.position[i])
      minY = Math.min(minY, a.position[i + 1])
      maxY = Math.max(maxY, a.position[i + 1])
    }
    expect(maxX - minX).toBeGreaterThan(0.5)
    expect(maxX - minX).toBeLessThan(0.65)
    expect(maxY - minY).toBeGreaterThan(0.68)
    expect(maxY).toBeLessThan(0)
  })

  it('UV: el frente en la mitad izquierda del atlas y la espalda en la derecha', () => {
    for (let i = 0; i < a.uv.length; i += 2) {
      const u = a.uv[i]
      const v = a.uv[i + 1]
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
      if (i / 2 < a.frontVertices) expect(u).toBeLessThan(0.5)
      else expect(u).toBeGreaterThan(0.5)
    }
  })

  it('cada cara mira hacia afuera (el frente a −Z, la espalda a +Z)', () => {
    for (const [side, sign] of [
      ['front', -1],
      ['back', 1],
    ]) {
      const f = buildFace(side)
      let wrong = 0
      for (let t = 0; t < f.index.length; t += 3) {
        const [i, j, k] = [f.index[t] * 3, f.index[t + 1] * 3, f.index[t + 2] * 3]
        const ax = f.position[j] - f.position[i]
        const ay = f.position[j + 1] - f.position[i + 1]
        const bx = f.position[k] - f.position[i]
        const by = f.position[k + 1] - f.position[i + 1]
        if (Math.sign(ax * by - ay * bx) !== sign) wrong++
      }
      expect(wrong).toBe(0)
    }
  })

  it('la tela es plana en la costura y llega a su espesor adentro', () => {
    expect(inflate(0)).toBe(0)
    expect(inflate(1)).toBeGreaterThan(0.04)
    expect(inflate(0.02)).toBeLessThan(inflate(0.06))
  })

  it('pointInPolygon', () => {
    const sq = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]
    expect(pointInPolygon(0.5, 0.5, sq)).toBe(true)
    expect(pointInPolygon(1.5, 0.5, sq)).toBe(false)
  })
})
