import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { positions } from '../config/site'
import { squad, stats } from '.'

describe('plantel', () => {
  it('dorsales únicos y entre 1 y 99', () => {
    const d = squad.map((p) => p.dorsal)
    expect(new Set(d).size).toBe(d.length)
    expect(d.every((n) => n >= 1 && n <= 99)).toBe(true)
  })

  it('ordenado por línea (así cuelga en el riel)', () => {
    const order = positions.map((p) => p.key)
    const idx = squad.map((p) => order.indexOf(p.pos))
    expect(idx.every((v) => v >= 0)).toBe(true)
    expect([...idx].sort((a, b) => a - b)).toEqual(idx)
  })

  it('hay un solo capitán', () => {
    expect(squad.filter((p) => p.capitan)).toHaveLength(1)
  })

  it('cada jugador tiene retrato y estadísticas', () => {
    for (const p of squad) {
      expect(existsSync(resolve(import.meta.dirname, '../../public/jugadores', `${p.dorsal}.webp`)), `retrato ${p.dorsal}`).toBe(true)
      expect(stats.players[String(p.dorsal)], `stats ${p.dorsal}`).toBeDefined()
    }
  })

  it('estadísticas coherentes: titular ≤ jugados ≤ convocado', () => {
    for (const s of Object.values(stats.players)) {
      expect(s.tit).toBeLessThanOrEqual(s.pj)
      expect(s.pj).toBeLessThanOrEqual(s.conv)
      expect(s.min).toBeLessThanOrEqual(s.pj * 120)
    }
  })

  it('los apellidos estampables usan solo caracteres de la remera', () => {
    for (const p of squad) expect(p.shirt).toMatch(/^[A-ZÁÉÍÓÚÜÑÇ0-9 .'-]+$/)
  })
})
