import { describe, expect, it } from 'vitest'
import { squad, stats, statsFor } from '../data'
import { profileMetrics, ratio, teamMatches } from './profile'
import { stageRectFor } from './stage'

const field = { pos: 'DEL', edad: 27, contrato: 2028 }
const keeper = { pos: 'ARQ', edad: 31, contrato: null }
const s = { conv: 14, pj: 12, tit: 9, goles: 4, asist: 2, ta: 3, tr: 1, min: 900 }

describe('teamMatches', () => {
  it('es el máximo de convocatorias del plantel', () => {
    expect(teamMatches({ players: { 1: { conv: 3 }, 2: { conv: 16 }, 3: { conv: 9 } } })).toBe(16)
  })
  it('sin jugadores o sin archivo da 0', () => {
    expect(teamMatches({ players: {} })).toBe(0)
    expect(teamMatches(undefined)).toBe(0)
    expect(teamMatches({ players: { 1: {} } })).toBe(0)
  })
  it('con los datos reales coincide con el máximo de conv', () => {
    const max = Math.max(...Object.values(stats.players).map((p) => p.conv))
    expect(teamMatches(stats)).toBe(max)
  })
})

describe('ratio', () => {
  it('no divide por cero ni por negativos', () => {
    expect(ratio(5, 0)).toBe(0)
    expect(ratio(5, -3)).toBe(0)
    expect(ratio(0, 0)).toBe(0)
  })
  it('acota a 0..1', () => {
    expect(ratio(150, 100)).toBe(1)
    expect(ratio(-4, 10)).toBe(0)
    expect(ratio(1, 4)).toBe(0.25)
  })
  it('ignora lo que no es número', () => {
    expect(ratio(undefined, 10)).toBe(0)
    expect(ratio(NaN, 10)).toBe(0)
    expect(ratio(3, undefined)).toBe(0)
  })
})

describe('profileMetrics', () => {
  it('jugador de campo: el tercer número son los goles', () => {
    const m = profileMetrics(field, s, 16)
    expect(m.third).toEqual({ key: 'goles', label: 'Goles', value: 4 })
    expect(m.keeper).toBe(false)
    expect(m.starterRate).toBe(75)
    expect(m.minutesCap).toBe(1440)
    expect(m.minutesShare).toBe(63) // 900 / 1440 = 62.5 → 63
    expect(m.contract).toBe(2028)
  })
  it('arquero: el tercer número es Convocado', () => {
    const m = profileMetrics(keeper, s, 16)
    expect(m.third).toEqual({ key: 'conv', label: 'Convocado', value: 14 })
    expect(m.keeper).toBe(true)
    expect(m.contract).toBeNull()
  })
  it('sin estadísticas: números en null y anillos sin valor', () => {
    const m = profileMetrics(field, undefined, 16)
    expect(m.hasStats).toBe(false)
    expect(m.minutes).toBeNull()
    expect(m.played).toBeNull()
    expect(m.third.value).toBeNull()
    expect(m.starterRate).toBeNull()
    expect(m.minutesShare).toBeNull()
    expect(m.age).toBe(27)
  })
  it('sin partidos jugados no divide por cero', () => {
    const m = profileMetrics(field, { ...s, pj: 0, tit: 0, min: 0 }, 0)
    expect(m.starterRate).toBe(0)
    expect(m.minutesShare).toBe(0)
    expect(m.minutesCap).toBe(0)
  })
  it('acota los porcentajes a 100 aunque los datos se pasen', () => {
    const m = profileMetrics(field, { ...s, tit: 20, min: 5000 }, 16)
    expect(m.starterRate).toBe(100)
    expect(m.minutesShare).toBe(100)
  })
  it('todo el plantel real da porcentajes enteros entre 0 y 100', () => {
    const n = teamMatches(stats)
    for (const p of squad) {
      const m = profileMetrics(p, statsFor(p), n)
      for (const v of [m.starterRate, m.minutesShare]) {
        if (v === null) continue
        expect(Number.isInteger(v)).toBe(true)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
    }
  })
})

describe('stageRectFor', () => {
  const base = { w: 1000, h: 800, top: 100, footerTop: 740 }
  it('con el hueco del perfil usa su rectángulo normalizado y tuck 0', () => {
    const r = stageRectFor({ ...base, landscape: true, slot: { left: 500, top: 120, right: 800, bottom: 720 } })
    expect(r).toEqual({ x0: 0.5, y0: 0.15, x1: 0.8, y1: 0.9, tuck: 0 })
  })
  it('el hueco nunca sube por encima de la cabecera y queda dentro de 0..1', () => {
    const r = stageRectFor({ ...base, landscape: true, slot: { left: -20, top: 10, right: 1200, bottom: 900 } })
    expect(r).toEqual({ x0: 0, y0: 0.125, x1: 1, y1: 1, tuck: 0 })
  })
  it('un hueco sin tamaño cae al cálculo de la ficha', () => {
    const r = stageRectFor({ ...base, landscape: true, slot: { left: 0, top: 0, right: 0, bottom: 0 }, card: { left: 600, top: 0 } })
    expect(r).toEqual({ x0: 0, y0: 0.125, x1: 0.6, y1: (740 + 28) / 800, tuck: 0 })
  })
  it('ficha en apaisado: a su izquierda', () => {
    const r = stageRectFor({ ...base, landscape: true, card: { left: 600, top: 200 } })
    expect(r.x1).toBe(0.6)
    expect(r.tuck).toBe(0)
  })
  it('ficha en vertical: encima, con tuck', () => {
    const r = stageRectFor({ ...base, landscape: false, card: { left: 8, top: 480 } })
    expect(r).toEqual({ x0: 0, y0: 0.125, x1: 1, y1: 0.6, tuck: 0.2 })
  })
  it('sin nada que medir devuelve null', () => {
    expect(stageRectFor({ ...base, landscape: true })).toBeNull()
    expect(stageRectFor({ ...base, w: 0, landscape: true, card: { left: 1, top: 1 } })).toBeNull()
  })
})
