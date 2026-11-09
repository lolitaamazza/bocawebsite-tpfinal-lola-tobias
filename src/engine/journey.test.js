import { describe, expect, it } from 'vitest'
import { journey, journeyYears } from '../data/journey'
import { hitoIndexForYear, rollOffsets, yearDigits } from './journey'

describe('rodillos del año', () => {
  it('separa las cifras', () => {
    expect(yearDigits('2007')).toEqual([2, 0, 0, 7])
    expect(yearDigits(2026)).toEqual([2, 0, 2, 6])
  })

  it('cada cifra se traduce a su desplazamiento en el rodillo', () => {
    expect(rollOffsets('2019')).toEqual([-20, -0, -10, -90])
  })
})

describe('hitoIndexForYear', () => {
  const hitos = [{ year: '2000' }, { year: '2003' }, { year: '2007' }]

  it('año con hito: ese mismo', () => {
    expect(hitoIndexForYear(hitos, '2003')).toBe(1)
  })

  it('año sin hito: el siguiente que tenga', () => {
    expect(hitoIndexForYear(hitos, '2001')).toBe(1)
  })

  it('después del último: el último', () => {
    expect(hitoIndexForYear(hitos, '2026')).toBe(2)
  })
})

describe('datos del Journey', () => {
  it('va de 2000 a 2026, en orden y sin años repetidos', () => {
    const years = journey.map((h) => Number(h.year))
    expect(years[0]).toBe(2000)
    expect(years.at(-1)).toBe(2026)
    expect([...years].sort((a, b) => a - b)).toEqual(years)
    expect(new Set(years).size).toBe(years.length)
  })

  it('cada hito tiene mes, texto y foto con crédito', () => {
    for (const h of journey) {
      expect(h.month, h.year).toBeTruthy()
      expect(h.text.length, h.year).toBeGreaterThan(20)
      expect(h.foto?.src, h.year).toMatch(/^\/journey\//)
      expect(h.foto?.license, h.year).toBeTruthy()
    }
  })

  it('la columna lista los 27 años', () => {
    expect(journeyYears).toHaveLength(27)
    expect(journeyYears[0]).toBe('2000')
    expect(journeyYears.at(-1)).toBe('2026')
  })
})
