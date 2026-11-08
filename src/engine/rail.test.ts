import { describe, expect, it } from 'vitest'
import { EDGE_MARGIN, GROUP_GAP, HANGER_GAP, centredSlot, layoutRail, neighbourPush, pickSlot, railBounds, stepSlot, type RailSlot } from './rail'
import type { PosKey } from '../types'

const slots = (...pos: PosKey[]): RailSlot[] => pos.map((p) => ({ pos: p, active: true, restX: 0 }))

describe('layoutRail', () => {
  it('centra el riel en 0 y separa las perchas', () => {
    const s = slots('ARQ', 'ARQ', 'ARQ')
    layoutRail(s)
    expect(s.map((x) => x.restX)).toEqual([-HANGER_GAP, 0, HANGER_GAP])
  })

  it('deja un hueco entre líneas y devuelve el rango de cada una', () => {
    const s = slots('ARQ', 'DEF', 'DEF')
    const groups = layoutRail(s)
    expect(s[1].restX - s[0].restX).toBeCloseTo(HANGER_GAP + GROUP_GAP)
    expect(s[2].restX - s[1].restX).toBeCloseTo(HANGER_GAP)
    expect(groups.map((g) => g.pos)).toEqual(['ARQ', 'DEF'])
    expect(groups[1]).toMatchObject({ minX: s[1].restX, maxX: s[2].restX })
  })

  it('ignora las inactivas (filtro) y no las mueve', () => {
    const s = slots('ARQ', 'DEF', 'DEF')
    s[0].active = false
    s[0].restX = 99
    const groups = layoutRail(s)
    expect(s[0].restX).toBe(99)
    expect(groups).toHaveLength(1)
    expect(s[1].restX + s[2].restX).toBeCloseTo(0)
  })

  it('no explota sin perchas activas', () => {
    expect(layoutRail([])).toEqual([])
  })
})

describe('railBounds', () => {
  it('permite recorrer de punta a punta con margen', () => {
    const s = slots(...Array.from({ length: 30 }, () => 'MED' as const))
    layoutRail(s)
    const b = railBounds(s, 1)
    expect(b.min).toBeCloseTo(s[0].restX - EDGE_MARGIN + 1)
    expect(b.max).toBeCloseTo(s[29].restX + EDGE_MARGIN - 1)
  })

  it('sin scroll cuando todo entra en pantalla', () => {
    const s = slots('ARQ', 'ARQ')
    layoutRail(s)
    expect(railBounds(s, 5)).toEqual({ min: 0, max: 0 })
  })
})

describe('pickSlot / centredSlot', () => {
  const s = slots('ARQ', 'ARQ', 'DEF')
  layoutRail(s)

  it('elige la percha más cercana dentro del radio', () => {
    expect(pickSlot(s, s[1].restX + 0.03)).toBe(1)
  })

  it('devuelve -1 entre líneas (fuera de radio)', () => {
    expect(pickSlot(s, (s[1].restX + s[2].restX) / 2)).toBe(-1)
  })

  it('centredSlot siempre devuelve una activa', () => {
    expect(centredSlot(s, 100)).toBe(2)
  })
})

describe('stepSlot', () => {
  const s = slots('ARQ', 'DEF', 'DEF', 'MED')
  s[2].active = false

  it('salta las inactivas y da la vuelta', () => {
    expect(stepSlot(s, 1, 1)).toBe(3)
    expect(stepSlot(s, 3, 1)).toBe(0)
    expect(stepSlot(s, 0, -1)).toBe(3)
  })

  it('sin punto de partida arranca por el principio o el final', () => {
    expect(stepSlot(s, -1, 1)).toBe(0)
    expect(stepSlot(s, -1, -1)).toBe(3)
  })
})

describe('neighbourPush', () => {
  it('empuja hacia afuera y decae con la distancia', () => {
    expect(neighbourPush(0)).toBe(0)
    expect(neighbourPush(1)).toBeGreaterThan(neighbourPush(5))
    expect(neighbourPush(-1)).toBeCloseTo(-neighbourPush(1))
  })
})
